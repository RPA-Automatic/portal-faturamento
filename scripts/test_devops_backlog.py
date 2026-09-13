import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.parse import urlparse
import configure_devops_backlog as backlog


class BacklogReplayTests(unittest.TestCase):
    def test_replay_resolves_computed_parent_and_reuses_existing_items(self):
        self.check_replay(False)

    def test_agile_replay_reuses_stories_under_features_without_creating_issues(self):
        self.check_replay(True)

    def check_replay(self, agile):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'azure-devops').mkdir()
            (root / 'azure-devops/config.json').write_text(json.dumps({
                'organization': 'https://dev.azure.com/example', 'project': 'Shared',
                'wiki_id': 'wiki', 'epic_id': 26, 'repo_url': 'https://github.com/example/product'}))
            (root / 'azure-devops/backlog.json').write_text(json.dumps({'epic_id': 26, 'issues': [
                {'key': 'PF-F01', 'title': 'Entrega', 'sprint': 1, 'depends_on': [], 'feature_key': 'PF-C01',
                 'tasks': [{'key': 'PF-F01-T01', 'title': 'Tarefa', 'acceptance': 'Verificar resultado'}]}]}))
            (root / 'azure-devops/agile-hierarchy-state.json').write_text(json.dumps({
                'features': [{'key': 'PF-C01', 'id': 88}]}))
            writes = []

            def transport(method, url, auth, body=None, headers=None):
                endpoint = urlparse(url).path.split('/_apis/')[1]
                if endpoint == 'wit/workitems/26':
                    return 200, {'id': 26, 'fields': {'System.TeamProject': 'Shared', 'System.WorkItemType': 'Epic'}}, {}
                if endpoint == 'wit/workitems/88':
                    return 200, {'id': 88, 'fields': {'System.TeamProject': 'Shared', 'System.WorkItemType': 'Feature', 'System.Parent': 26}}, {}
                if endpoint == 'wit/workitemtypes':
                    return 200, {'value': [{'name': n} for n in (['Epic', 'Issue', 'Task', 'Feature', 'User Story', 'Bug'] if agile else ['Epic', 'Issue', 'Task'])]}, {}
                if endpoint == 'wit/wiql':
                    return 200, {'workItems': [{'id': 27}, {'id': 28}]}, {}
                if endpoint == 'wit/workitemsbatch':
                    records = []
                    for id, kind, key, parent in [(27, 'User Story' if agile else 'Issue', 'PF-F01', 88 if agile else 26), (28, 'Task', 'PF-F01-T01', 27)]:
                        fields = {'System.WorkItemType': kind, 'System.Tags': key}
                        # The live API omits the computed Parent unless explicitly requested.
                        if 'System.Parent' in body.get('fields', []):
                            fields['System.Parent'] = parent
                        records.append({'id': id, 'fields': fields})
                    return 200, {'value': records}, {}
                if method != 'GET':
                    writes.append(endpoint)
                return 200, {}, {}

            with patch.object(backlog, 'ROOT', root), patch.object(backlog, 'authorization', return_value='test'), patch.object(backlog, 'request', transport):
                result = backlog.run(False)
            self.assertEqual([i['id'] for i in result['items']], [27, 28])
            self.assertTrue(all(i['action'] == 'reuse' for i in result['items']))
            self.assertEqual(writes, [])


if __name__ == '__main__':
    unittest.main()
