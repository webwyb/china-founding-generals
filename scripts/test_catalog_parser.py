"""Regression checks using committed, source-attributed factual fixtures."""
import json
import unittest
from pathlib import Path
from build_catalog import parse_facts, identity_rejection, ROOT
from portrait_sources import portrait_is_rejected, rejected_portrait_sources


def record(body, name='测试甲', kind='people', rank='少将', title=''):
    return {'name': name, 'kind': kind, 'rank': rank, 'body': body, 'title': title, 'url': 'https://example.invalid/biography'}


class FactualExtraction(unittest.TestCase):
    def test_appointments_are_not_life_dates(self):
        facts = parse_facts(record('中国人民解放军少将（1955）。1912年5月17日生于湖南茶陵。1970～1977年任副司令员。2001年1月22日在北京逝世。'))
        self.assertEqual((facts['birth'], facts['death']), (1912, 2001))

    def test_structured_database_dates(self):
        facts = parse_facts(record('测试甲\n（Test Jia）\n1914.00.00 - 1964.03.05\n军衔：1955.09.27空军少将', kind='memorial'))
        self.assertEqual((facts['birth'], facts['death'], facts['grantYear']), (1914, 1964, 1955))

    def test_alias_before_life_dates(self):
        facts = parse_facts(record('测试甲（又名测试乙，1900年—1976年），湖南茶陵人。'))
        self.assertEqual((facts['birth'], facts['death']), (1900, 1976))

    def test_relative_death_is_not_subject_death(self):
        facts = parse_facts(record('测试甲，1914年出生。1935年母亲病逝。'))
        self.assertIsNone(facts['death'])

    def test_workplace_is_not_hometown(self):
        facts = parse_facts(record('中国人民解放军少将（1955）。1911年生于湖南省醴陵县南洋桥一个铁匠家庭。后到江西萍乡安源煤矿当工人。'))
        self.assertEqual(facts['province'], '湖南')
        self.assertEqual(facts['hometownType'], '出生地')
        self.assertNotIn('当工', facts['hometown'])

    def test_namesake_relative_does_not_establish_founding_identity(self):
        candidate = record('杨俊生，女，福建省长汀县人，中国人民武装警察部队高级将领。其父为中国人民解放军开国上将杨成武。1996年7月11日晋升武警专业技术少将警衔。', name='杨俊生', kind='wiki')
        candidate['facts'] = parse_facts(candidate)
        self.assertIsNotNone(identity_rejection(candidate, {1916}))

    def test_later_namesake_is_rejected(self):
        candidate = record('李平（1925年—2018年）。山东蓬莱人。1988年被授予中国人民解放军中将。', name='李平', kind='wiki', title='李平 (中将)')
        candidate['facts'] = parse_facts(candidate)
        self.assertIsNotNone(identity_rejection(candidate, {1914, 1915}))

    def test_second_promotion_is_not_a_namesake(self):
        candidate = record('向守志（1917年—2017年），中国人民解放军上将。1988年被授予上将军衔。', name='向守志', kind='wiki')
        candidate['facts'] = parse_facts(candidate)
        self.assertIsNone(identity_rejection(candidate, {1917}))

    def test_zhou_renjie_source_fixture(self):
        fixture=json.loads((ROOT/'data/testing/parser-fixtures.json').read_text())['zhouRenjie']
        facts=parse_facts(record(fixture['input'],name='周仁杰'))
        self.assertEqual(facts['death'],fixture['expected']['death'])
        self.assertEqual(facts['birth'],fixture['expected']['birth'])


class PortraitSourceIdentity(unittest.TestCase):
    def test_conflicting_caption_stays_rejected_after_url_normalization(self):
        candidate = {'source': 'https://commons.wikimedia.org/wiki/File:Wang%20Zheng.jpg?uselang=zh', 'url': 'https://upload.wikimedia.org/example.jpg'}
        self.assertTrue(portrait_is_rejected('p0080', candidate, rejected_portrait_sources()))

    def test_reviewed_group_photo_is_not_a_portrait_candidate(self):
        candidate = {'source': 'https://commons.wikimedia.org/wiki/File:Nie_Fengzhi_group_photo_during_Second_Sino-Japanese_War.jpg', 'url': 'https://upload.wikimedia.org/group.jpg'}
        self.assertTrue(portrait_is_rejected('p0203', candidate, rejected_portrait_sources()))

    def test_rejection_does_not_block_another_original_or_person(self):
        approved = {'source': 'https://news.xidian.edu.cn/info/1028/286166.htm', 'url': 'https://news.xidian.edu.cn/__local/B/7B/F1/18697280A8D0EC4E521812B5710_A29040DA_2A17A.png'}
        rejected = rejected_portrait_sources()
        self.assertFalse(portrait_is_rejected('p0080', approved, rejected))
        self.assertFalse(portrait_is_rejected('p0001', {'source': 'https://commons.wikimedia.org/wiki/File:Wang_Zheng.jpg', 'url': 'https://upload.wikimedia.org/example.jpg'}, rejected))


if __name__ == '__main__': unittest.main()
