import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from ai_chat import endpoint_url, request_reply, PrivateChatStore, import_personal_chat

class FakeOpener:
    def __init__(self, answer=None, status=200):
        self.answer=answer or {'choices':[{'message':{'content':'你好，我在这里。'}}]}
        self.status=status
    def open(self, request, timeout):
        self.request=request
        self.timeout=timeout
        if self.status!=200:raise HTTPError(request.full_url,self.status,'private-provider-details',{},None)
        return io.BytesIO(json.dumps(self.answer).encode())

class ChatTests(unittest.TestCase):
    def test_protocol_and_bounded_context(self):
        opener=FakeOpener()
        history=[dict(role='user',content='hello') for _ in range(20)]
        answer=request_reply({'endpoint':'https://api.deepseek.com/v1','model':'test'},'not-a-real-key',history,opener)
        self.assertIn('你好',answer)
        body=json.loads(opener.request.data)
        self.assertEqual(len(body['messages']),13)
        self.assertEqual(body['max_tokens'],800)
        self.assertFalse(body['stream'])
        self.assertNotIn('apiKey',body)
        self.assertEqual(opener.request.get_header('Authorization'),'Bearer not-a-real-key')
        self.assertEqual(opener.request.full_url,'https://api.deepseek.com/v1/chat/completions')
    def test_invalid_urls_keys_and_safe_provider_errors(self):
        for endpoint in ['http://example.com','https://u:p@example.com','https://example.com?key=private','https://example.com:8000']:
            with self.assertRaises(ValueError):endpoint_url(endpoint)
        settings={'endpoint':'https://example.com/v1','model':'test'}
        for key in ['', 'bad\nkey']:
            with self.assertRaises(ValueError):request_reply(settings,key,[dict(role='user',content='hi')],FakeOpener())
        with self.assertRaisesRegex(ValueError,'Key 无效'):
            request_reply(settings,'test',[dict(role='user',content='hi')],FakeOpener(status=401))
        with self.assertRaisesRegex(ValueError,'文字'):
            request_reply(settings,'test',[dict(role='user',content='hi')],FakeOpener({'choices':[{'message':{'tool_calls':[]}}]}))
    @unittest.skipUnless(os.name=='nt','Windows DPAPI only')
    def test_local_encrypted_key_is_not_written_in_bundle(self):
        with tempfile.TemporaryDirectory(dir='D:/网站计划/.build-tools/chat-diy-20261110') as directory:
            with patch.dict(os.environ,{'LOCALAPPDATA':directory}):
                bundle=Path(directory)/'bundle'
                store=PrivateChatStore(bundle)
                data={'key':'secret-test-not-real','settings':{'mode':'byok','model':'test'}}
                store.save(data)
                self.assertNotIn(b'secret-test',store.path.read_bytes())
                self.assertEqual(store.load(),data)
                self.assertFalse(bundle.exists())
                store.forget()
                self.assertEqual(store.load(),{})

    def test_personal_download_imports_key_and_removes_plaintext_after_encrypted_save(self):
        with tempfile.TemporaryDirectory(dir='D:/网站计划/.build-tools/chat-wardrobe-20261110') as directory:
            with patch.dict(os.environ,{'LOCALAPPDATA':directory}):
                bundle=Path(directory)/'bundle';(bundle/'assets').mkdir(parents=True)
                path=bundle/'assets/private-chat.json'
                path.write_text(json.dumps({'key':'owner-download-key','settings':{'mode':'byok','endpoint':'https://api.deepseek.com','model':'test'}}),encoding='utf8')
                store=PrivateChatStore(bundle);data=import_personal_chat(bundle,store)
                self.assertEqual(data['key'],'owner-download-key');self.assertFalse(path.exists())
                self.assertEqual(store.load()['key'],'owner-download-key')
                self.assertNotIn(b'owner-download-key',store.path.read_bytes())
                opener=FakeOpener();request_reply(data['settings'],data['key'],[dict(role='user',content='hello')],opener)
                self.assertEqual(opener.request.get_header('Authorization'),'Bearer owner-download-key')
                self.assertEqual(import_personal_chat(bundle,store),{})
                store.forget()

    def test_failed_encryption_preserves_portable_setup_for_retry(self):
        with tempfile.TemporaryDirectory(dir='D:/网站计划/.build-tools/chat-wardrobe-20261110') as directory:
            bundle=Path(directory);(bundle/'assets').mkdir()
            path=bundle/'assets/private-chat.json';path.write_text(json.dumps({'key':'key','settings':{'endpoint':'https://api.deepseek.com','model':'test'}}))
            with patch.object(PrivateChatStore,'save',side_effect=OSError('blocked')):
                with self.assertRaises(OSError):import_personal_chat(bundle,PrivateChatStore(bundle))
            self.assertTrue(path.exists())

if __name__=='__main__':unittest.main()
