import json
import unittest
import tempfile
from pathlib import Path
from unittest.mock import patch
from free_ai import SharedChatStore, import_shared_chat, shared_reply, valid_credential, API

class Response:
    def __enter__(self):return self
    def __exit__(self,*args):pass
    def read(self,*args):return json.dumps({'choices':[{'message':{'content':'喵你好'}}]}).encode('utf8')

class FreeAiTests(unittest.TestCase):
    def test_import_and_direct_desktop_chat_without_provider_key(self):
        credential={'token':'a'*64,'expiresAt':'2099-01-01T00:00:00Z'}
        self.assertTrue(valid_credential(credential))
        with tempfile.TemporaryDirectory(dir='D:/网站计划/.build-tools') as directory:
            bundle=Path(directory);(bundle/'assets').mkdir();source=bundle/'assets/shared-chat.json';source.write_text(json.dumps(credential))
            store=SharedChatStore(bundle)
            with patch.dict('os.environ',{'LOCALAPPDATA':directory}):
                store=SharedChatStore(bundle)
                data=import_shared_chat(bundle,store)
                self.assertFalse(source.exists());self.assertEqual(store.load(),credential)
                class Opener:
                    def open(self,request,timeout):
                        self.request=request;return Response()
                opener=Opener();answer=shared_reply(data,[{'role':'user','content':'你好'}],opener)
                self.assertEqual(answer,'喵你好');self.assertEqual(opener.request.full_url,API+'/ai/chat')
                self.assertEqual(opener.request.headers['Authorization'],'Bearer '+'a'*64)
                self.assertNotIn('model',json.loads(opener.request.data));store.forget()

    def test_expiry_and_import_failure(self):
        self.assertFalse(valid_credential({'token':'a'*64,'expiresAt':'2000-01-01T00:00:00Z'}))
        self.assertFalse(valid_credential({'token':'x','expiresAt':'invalid'}))
        with tempfile.TemporaryDirectory(dir='D:/网站计划/.build-tools') as directory:
            bundle=Path(directory);(bundle/'assets').mkdir();source=bundle/'assets/shared-chat.json';source.write_text(json.dumps({'token':'a'*64,'expiresAt':'2099-01-01T00:00:00Z'}))
            with patch.object(SharedChatStore,'save',side_effect=OSError('failed')):
                with self.assertRaises(OSError):import_shared_chat(bundle,SharedChatStore(bundle))
            self.assertTrue(source.exists())

if __name__=='__main__':unittest.main()
