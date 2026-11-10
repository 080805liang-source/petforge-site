"""User-owned Chat Completions connection. No service keys are bundled."""
import ctypes
from ctypes import wintypes
import hashlib
import json
import os
from pathlib import Path
import urllib.request
import urllib.error
from urllib.parse import urlsplit, urlunsplit


def endpoint_url(value):
    value = str(value).strip()
    try:
        url = urlsplit(value)
        if url.scheme != 'https' or not url.hostname or url.username or url.password or url.query or url.fragment or url.port not in (None, 443):
            raise ValueError()
    except ValueError:
        raise ValueError('请填写不含账号和参数的 HTTPS 模型接口地址。') from None
    path = url.path.rstrip('/')
    if not path.endswith('/chat/completions'):
        path += '/chat/completions'
    return urlunsplit(('https', url.netloc, path, '', ''))


def api_error(status):
    return {400:'模型名称或请求格式无效，请检查配置。',401:'API Key 无效或已过期。',402:'模型账户额度不足。',403:'此 Key 没有模型调用权限。',404:'接口或模型不存在。',429:'服务商限流或额度已用尽，请稍后重试。'}.get(status, '模型服务暂时不可用，请稍后重试。')


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def request_reply(settings, key, history, opener=None):
    endpoint = endpoint_url(settings.get('endpoint', ''))
    if not isinstance(key, str) or not key.strip() or len(key) > 4096 or '\r' in key or '\n' in key:
        raise ValueError('请先在聊天设置中填写自己的 API Key。')
    model = str(settings.get('model', '')).strip()
    if not model or len(model) > 160 or '\r' in model or '\n' in model:
        raise ValueError('请填写服务商提供的模型名称或 Agent ID。')
    messages = [{'role':item['role'],'content':item['content'][:4000]} for item in history[-12:] if item.get('role') in ('user','assistant') and isinstance(item.get('content'),str)]
    if not messages or messages[-1]['role'] != 'user':
        raise ValueError('请先输入要发送的内容。')
    prompt = str(settings.get('prompt') or '你是一只友善的桌面宠物。用简洁自然的中文回答，帮助用户处理日常问题。')[:1200]
    body = {'model':model,'messages':[{'role':'system','content':prompt}]+messages,'stream':False,'max_tokens':800}
    request = urllib.request.Request(endpoint, data=json.dumps(body,ensure_ascii=False).encode('utf8'), headers={'Content-Type':'application/json','Authorization':'Bearer '+key}, method='POST')
    opener = opener or urllib.request.build_opener(NoRedirect())
    try:
        with opener.open(request, timeout=55) as response:
            raw = response.read(200001)
            if len(raw) > 200000:
                raise ValueError('模型回复过长，请重新发送。')
            result = json.loads(raw)
        text = result.get('choices',[{}])[0].get('message',{}).get('content')
        if not isinstance(text,str) or not text.strip():
            raise ValueError('接口未返回文字，请确认支持 Chat Completions。')
        return text[:12000]
    except urllib.error.HTTPError as error:
        raise ValueError(api_error(error.code)) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise ValueError('模型连接失败或超时，请检查网络与接口地址。') from None
    except (json.JSONDecodeError, KeyError, IndexError, TypeError):
        raise ValueError('接口返回格式不兼容，请使用 Chat Completions 接口。') from None


class DataBlob(ctypes.Structure):
    _fields_ = [('cbData',wintypes.DWORD),('pbData',ctypes.POINTER(ctypes.c_ubyte))]


def protect(data, decrypt=False):
    if os.name != 'nt':
        raise OSError('仅 Windows 支持加密记住 Key；可不勾选记住后继续使用。')
    crypt = ctypes.WinDLL('crypt32',use_last_error=True)
    kernel = ctypes.WinDLL('kernel32',use_last_error=True)
    kernel.LocalFree.argtypes=[ctypes.c_void_p]; kernel.LocalFree.restype=ctypes.c_void_p
    buffer=ctypes.create_string_buffer(data)
    source=DataBlob(len(data),ctypes.cast(buffer,ctypes.POINTER(ctypes.c_ubyte))); output=DataBlob()
    function=crypt.CryptUnprotectData if decrypt else crypt.CryptProtectData
    function.argtypes=[ctypes.POINTER(DataBlob),ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p,ctypes.c_void_p,wintypes.DWORD,ctypes.POINTER(DataBlob)]
    function.restype=wintypes.BOOL
    if not function(ctypes.byref(source),None,None,None,None,1,ctypes.byref(output)):
        raise OSError('Windows 无法加密保存 Key，请取消记住后使用。')
    try:
        return ctypes.string_at(output.pbData,output.cbData)
    finally:
        kernel.LocalFree(output.pbData)


class PrivateChatStore:
    def __init__(self, bundle):
        ident=hashlib.sha256(str(Path(bundle).resolve()).encode('utf8')).hexdigest()[:24]
        self.path=Path(os.environ.get('LOCALAPPDATA',str(Path.home()))) / 'PetForge' / ('chat-'+ident+'.dat')

    def load(self):
        try:
            data=json.loads(protect(self.path.read_bytes(),True).decode('utf8'))
            return data if isinstance(data,dict) else {}
        except (OSError,ValueError,UnicodeError):
            return {}

    def save(self, data):
        encrypted=protect(json.dumps(data,ensure_ascii=False).encode('utf8'))
        self.path.parent.mkdir(parents=True,exist_ok=True)
        temporary=self.path.with_suffix('.tmp')
        temporary.write_bytes(encrypted)
        temporary.replace(self.path)

    def forget(self):
        self.path.unlink(missing_ok=True)
