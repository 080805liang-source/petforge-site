import json
import unittest
from pathlib import Path
from response_bank import ResponseBank

ROOT=Path(__file__).resolve().parents[1]

class ResponseBankTests(unittest.TestCase):
    def test_all_replies_are_unique_and_each_topic_cycles_before_repeating(self):
        bank=ResponseBank(ROOT/'assets/responses.json')
        replies=[line for topic in bank.topics.values() for line in topic['replies']]
        self.assertGreaterEqual(len(set(replies)),1000)
        self.assertEqual(len(replies),len(set(replies)))
        for key,topic in bank.topics.items():
            cycle=[bank.reply(topic=key) for _ in topic['replies']]
            self.assertEqual(set(cycle),set(topic['replies']))
            self.assertNotEqual(cycle[-1],bank.reply(topic=key))

    def test_chat_matches_topics_and_keeps_unknown_input_local(self):
        bank=ResponseBank(ROOT/'assets/responses.json')
        for text,topic in [('代码有bug','coding'),('我很难过','sad'),('晚安，我睡了','sleep'),('完全没有关键词','default')]:
            self.assertIn(bank.reply(text),bank.topics[topic]['replies'])

    def test_old_packages_without_reply_asset_still_run(self):
        bank=ResponseBank(ROOT/'missing-response-bank.json')
        self.assertTrue(bank.reply('hello'))

if __name__=='__main__':unittest.main()
