"""Regressions for errors found while reviewing real biography patterns."""
import copy
import unittest
from biography_content import extract_prose, extract_memorial, enrich_person

PERSON={'name':'测试甲','birth':1910,'death':2000,'rank':'少将','tagline':'旧简介','timeline':[], 'sources':[]}


class BiographyFacts(unittest.TestCase):
    def extract(self,text):
        return extract_prose(text,PERSON)

    def test_old_year_does_not_leak_into_a_later_job(self):
        facts=self.extract('1933年加入中国共产党，曾任第1步兵学校政委。后任福建省军区司令员。')
        self.assertTrue(facts['appointments'])
        self.assertTrue(all(x['year'] is None for x in facts['appointments']))

    def test_new_period_in_same_paragraph(self):
        facts=self.extract('1941年任新四军独立团政委。第二次国共内战期间，任华东野战军第六纵队政治部主任。中华人民共和国成立后，任公安十三师政委。')
        self.assertEqual([x['period'] for x in facts['appointments']],['抗日战争时期','解放战争时期','军队与国防建设'])
        self.assertEqual([x['year'] for x in facts['appointments']],[1941,None,None])

    def test_short_headings_reset_a_previous_life_stage(self):
        facts=self.extract('解放战争时期\n任华东野战军参谋长。\n土地革命战争时期\n任红军总部特务团副官主任。\n抗日战争时期\n1940年2月，任新四军军需处处长、后勤部长。')
        self.assertEqual([x['period'] for x in facts['appointments']],['解放战争时期','红军时期','抗日战争时期'])
        self.assertIsNone(facts['appointments'][2]['year'])

    def test_1949_job_never_stays_under_an_antijapanese_heading(self):
        facts=self.extract('抗日战争时期\n任八路军第一师政治部主任。1949年任第四野战军参谋长。')
        self.assertEqual(facts['appointments'][1]['period'],'解放战争时期')

    def test_postwar_organisations_do_not_inherit_an_earlier_war(self):
        facts=self.extract('抗日战争时期，任八路军第一师政治部主任。历任东北民主联军某纵队副师长。')
        self.assertEqual(facts['appointments'][1]['period'],'后续任职')

    def test_broken_unit_numbers_are_excluded(self):
        self.assertEqual(self.extract('曾任东北野战军第6纵队1副师长。')['appointments'],[])
        self.assertEqual(len(self.extract('曾任东北野战军第6纵队18师副师长。')['appointments']),1)

    def test_date_range_uses_start(self):
        self.assertEqual(self.extract('1970年至1977年任福建省军区副司令员。')['appointments'][0]['year'],1970)

    def test_explicit_same_year_and_next_year(self):
        facts=self.extract('1941年任新四军独立团政委。同年任新四军第一师参谋长。次年任新四军第二师参谋长。')
        self.assertEqual([x['year'] for x in facts['appointments']],[1941,1941,1942])

    def test_a_date_does_not_date_an_entire_job_list(self):
        self.assertIsNone(self.extract('1964年任铁道兵副政治委员、铁道兵顾问。')['appointments'][0]['year'])

    def test_school_date_does_not_date_following_job(self):
        self.assertIsNone(self.extract('1931年底进入福建军区随营学校学习，任政治连排长。')['appointments'][0]['year'])

    def test_not_a_relative_or_other_commanders_operation(self):
        self.assertEqual(self.extract('1928年，与毛泽东领导的秋收起义部队会师。1937年，父亲任地方学校校长。')['operations'],[])
        self.assertEqual(self.extract('1937年，父亲任地方学校校长。')['appointments'],[])

    def test_a_memorial_volume_is_not_the_subjects_work(self):
        self.assertEqual(self.extract('出版有《怀念测试甲》。为《战史》写了序言。')['works'],[])
        self.assertEqual(self.extract('著有《测试甲回忆录》。')['works'],['《测试甲回忆录》'])

    def test_year_must_be_in_the_subjects_lifetime(self):
        facts=self.extract('1901年任省军区司令员。2010年任省军区顾问。')
        self.assertTrue(all(x['year'] is None for x in facts['appointments']))

    def test_structured_postwar_is_not_automatically_post_1949(self):
        facts=extract_memorial('院校\n不详\n战时任职\n◆1938.01.01-1942.01.01\n八路军独立团团长\n战后情况\n东北民主联军独立师师长\n荣誉\n不详',PERSON)
        self.assertEqual(facts['appointments'][0]['year'],1938)
        self.assertEqual(facts['appointments'][1]['period'],'后续任职')
        self.assertIsNone(facts['appointments'][1]['year'])

    def test_enrichment_does_not_resolve_disputed_core_fields(self):
        person={**copy.deepcopy(PERSON),'birth':None,'death':None,'pendingFields':['birth','death'],'province':'地域待核实'}
        result=enrich_person(person,{'knownRole':'总后勤部财务部部长'},{'knownRole':'https://example.org/profile'},None,[])
        self.assertIsNone(result['birth'])
        self.assertIsNone(result['death'])
        self.assertEqual(result['pendingFields'],['birth','death'])
        self.assertEqual(result['province'],'地域待核实')
        self.assertIn('总后勤部财务部部长',result['tagline'])
        self.assertEqual(result['biographySections'][0]['sourceUrls'],['https://example.org/profile'])


if __name__=='__main__':
    unittest.main()
