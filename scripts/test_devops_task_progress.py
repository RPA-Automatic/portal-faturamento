import unittest
from unittest.mock import patch

import update_devops_task_progress as progress


EVIDENCE = 'https://github.com/RPA-Automatic/portal-faturamento/actions/runs/123'


def work_item(state='New', relations=None, revision=7):
    return {
        'id': 29,
        'rev': revision,
        'fields': {
            'System.TeamProject': 'RPA Automatic',
            'System.WorkItemType': 'Task',
            'System.Parent': 27,
            'System.State': state,
        },
        'relations': relations or [],
    }


class TaskProgressTests(unittest.TestCase):
    @patch.object(progress, 'authorization', return_value='Bearer test')
    @patch.object(progress, 'request')
    def test_plan_reads_but_never_writes(self, request_mock, _authorization):
        request_mock.return_value = (200, work_item(), {})
        result = progress.update('PF-F01-T02', 'Active', EVIDENCE, 'Mapeamento validado.', apply=False)
        self.assertEqual('update', result['action'])
        self.assertEqual(['GET'], [call.args[0] for call in request_mock.call_args_list])

    @patch.object(progress, 'authorization', return_value='Bearer test')
    @patch.object(progress, 'request')
    def test_apply_checks_revision_and_verifies_state_and_evidence(self, request_mock, _authorization):
        linked = {'rel': 'Hyperlink', 'url': EVIDENCE, 'attributes': {'comment': 'Evidência do incremento'}}
        request_mock.side_effect = [
            (200, work_item(), {}),
            (200, {}, {}),
            (200, work_item('Active', [linked], 8), {}),
        ]
        result = progress.update('PF-F01-T02', 'Active', EVIDENCE, 'Mapeamento validado.', apply=True)
        self.assertEqual('update', result['action'])
        patch_body = request_mock.call_args_list[1].args[3]
        self.assertEqual({'op': 'test', 'path': '/rev', 'value': 7}, patch_body[0])
        self.assertTrue(any(item.get('path') == '/fields/System.State' for item in patch_body))
        self.assertTrue(any(item.get('path') == '/relations/-' for item in patch_body))


if __name__ == '__main__':
    unittest.main()
