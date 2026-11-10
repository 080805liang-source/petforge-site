"""Studio-hosted AI. Bundles contain only revocable chat credentials, never a provider key."""
import json
from pathlib import Path
import urllib.request
import urllib.error
from datetime import datetime, timezone
from ai_chat import PrivateChatStore, NoRedirect

API = 'https://cloud-paw-vip-cn-d0eub7r110788a3-1460995143.ap-shanghai.app.tcloudbase.com/api'


def api_call(path, body, token='', opener=None, method='POST'):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = 'Bearer ' + token
    request = urllib.request.Request(API + path, data=None if method=='GET' else json.dumps(body, ensure_ascii=False).encode('utf8'), headers=headers, method=method)
    try:
        with (opener or urllib.request.build_opener(NoRedirect())).open(request, timeout=22) as response:
            raw = response.read(64001)
            if len(raw) > 64000: raise ValueError('AI 回复异常，请稍后重试。')
            return json.loads(raw)
    except urllib.error.HTTPError as error:
        try: message = json.loads(error.read(64000)).get('error')
        except (ValueError, OSError): message = ''
        raise ValueError(message or ('请重新登录绑定免费 AI。' if error.code == 401 else '免费 AI 暂不可用，请稍后重试。')) from None
    except (urllib.error.URLError, TimeoutError, OSError):
        raise ValueError('无法连接免费 AI，请检查网络后重试。') from None
    except (TypeError, KeyError, json.JSONDecodeError):
        raise ValueError('免费 AI 返回异常，请稍后重试。') from None


class SharedChatStore(PrivateChatStore):
    def __init__(self, bundle):
        super().__init__(bundle)
        self.path = self.path.with_name(self.path.name.replace('chat-', 'free-ai-'))


def valid_credential(data):
    if not isinstance(data, dict): return False
    token = data.get('token', '')
    try: expires = datetime.fromisoformat(str(data.get('expiresAt', '')).replace('Z', '+00:00'))
    except ValueError: return False
    return isinstance(token, str) and len(token) == 64 and all(c in '0123456789abcdef' for c in token) and expires.tzinfo is not None and expires > datetime.now(timezone.utc)


def import_shared_chat(bundle, store):
    path = Path(bundle) / 'assets/shared-chat.json'
    if not path.is_file(): return store.load()
    if path.stat().st_size > 2048: raise ValueError('免费 AI 绑定文件无效，请重新登录。')
    data = json.loads(path.read_text(encoding='utf8'))
    if not valid_credential(data):
        path.unlink()
        return {}
    saved = {'token': data['token'], 'expiresAt': data['expiresAt']}
    store.save(saved)
    path.unlink()
    return saved


def login_shared(email, password, opener=None):
    session = api_call('/auth/login', {'identity': 'email', 'email': email.strip().lower(), 'password': password}, opener=opener)
    token = session.get('token', '')
    if not token: raise ValueError('登录返回异常，请稍后重试。')
    try:
        result = api_call('/ai/device-token', {}, token, opener)
        if not valid_credential(result): raise ValueError('免费 AI 绑定失败。')
        return result
    finally:
        try: api_call('/auth/logout', {}, token, opener)
        except ValueError: pass


def shared_reply(credential, history, opener=None, on_quota=None):
    if not valid_credential(credential): raise ValueError('免费 AI 绑定已过期，请点击“登录免费 AI”重新登录。')
    messages = [{'role': m['role'], 'content': m['content'][:1000]} for m in history[-6:] if m.get('role') in ('user', 'assistant') and isinstance(m.get('content'), str)]
    result = api_call('/ai/chat', {'messages': messages}, credential['token'], opener)
    if on_quota and isinstance(result.get('quota'),dict): on_quota(result['quota'])
    try: text = result['choices'][0]['message']['content']
    except (KeyError, IndexError, TypeError): raise ValueError('免费 AI 未返回文字。') from None
    if not isinstance(text, str) or not text.strip(): raise ValueError('免费 AI 未返回文字。')
    return text[:4000]


def shared_quota(credential):
    if not valid_credential(credential):return {}
    return api_call('/ai/status', {}, credential['token'], method='GET').get('quota', {})
