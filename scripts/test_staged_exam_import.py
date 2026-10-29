"""Exercise archive exclusion and selective activation using the real importer."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]


class StagedExamImportTest(unittest.TestCase):
    def test_archive_and_selective_activation(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for name in ('scripts', 'materials', 'backend/seed', 'public/tests'):
                shutil.copytree(ROOT / name, root / name)
            shutil.copyfile(ROOT / 'public/library.json', root / 'public/library.json')

            def runtime_snapshot():
                paths = list((root / 'backend/seed').glob('*.json'))
                paths += [root / 'public/library.json', root / 'materials/exam/question-memberships.json']
                return {str(p.relative_to(root)): p.read_bytes() for p in paths}

            def run_import():
                subprocess.run([sys.executable, str(root / 'scripts/import-exam-captures.py')],
                               check=True, capture_output=True, text=True)

            before = runtime_snapshot()
            run_import()
            self.assertEqual(before, runtime_snapshot(), 'Staged content must not change application data')
            captures = []
            for path in sorted((root / 'materials/exam').glob('exam-*-capture.json')):
                questions = json.loads(path.read_text())['questions']
                if questions and all(q.get('training_enabled') is False for q in questions):
                    captures.append(path)
            for path in captures:
                data = json.loads(path.read_text())
                self.assertEqual(len(data['questions']), 30)
                self.assertEqual([q['source_ordinal'] for q in data['questions']], list(range(1, 31)))
                self.assertEqual(data['source'], '')
                for q in data['questions']:
                    self.assertIs(q['portal_completed'], True)
                    self.assertIs(q['training_enabled'], False)
                    self.assertEqual(sum(a.get('correct') is True for a in q['answers']), 1)
                    if q['local_image']:
                        self.assertTrue((path.parent / q['local_image']).is_file())
                    for image in q['help_images']:
                        self.assertTrue((path.parent / image).is_file())
                if 'portal_result' in data:
                    self.assertEqual(data['portal_result'], {'correct': 30, 'wrong': 0, 'unanswered': 0})
                    for q in data['questions']:
                        self.assertTrue(next(a for a in q['answers'] if a['letter'] == q['selected_letter'])['correct'])

            path = captures[0]
            data = json.loads(path.read_text())
            data['questions'][0]['training_enabled'] = True
            expected_topics = data['questions'][0]['topic_ids']
            path.write_text(json.dumps(data))
            run_import()
            seed_path = root / 'backend/seed/test-101001.json'
            seed = json.loads(seed_path.read_text())
            self.assertEqual(len(seed['questions']), 1)
            self.assertEqual(seed['questions'][0]['source_ordinal'], 1)
            self.assertEqual(seed['questions'][0]['topic_ids'], expected_topics)
            for name in ('public/library.json', 'backend/seed/library.json'):
                library = json.loads((root / name).read_text())
                new = [q for q in library['questions'] if q['question_id'].startswith(('exam:1001:', 'exam:1002:'))]
                self.assertEqual([q['question_id'] for q in new], ['exam:1001:01'])
                self.assertTrue(new[0]['verified'])
            self.assertTrue((root / 'public/tests/exam/1001/q01.jpg').is_file())

            data['questions'][0]['training_enabled'] = False
            path.write_text(json.dumps(data))
            run_import()
            self.assertFalse(seed_path.exists(), 'Disabled captures must not leave a stale seed')
            self.assertEqual(before, runtime_snapshot())


if __name__ == '__main__':
    unittest.main()
