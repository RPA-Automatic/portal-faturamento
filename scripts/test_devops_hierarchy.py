import unittest
from migrate_devops_hierarchy import conversion_patch, parent_patch
from publish_devops_wiki import WikiError


class HierarchyTests(unittest.TestCase):
    def test_progress_maps_without_reset_or_description_changes(self):
        current = {'id': 27, 'rev': 5, 'fields': {'System.WorkItemType': 'Issue',
                   'System.State': 'Doing', 'System.Description': 'Preservar', 'System.AssignedTo': 'Owner'}}
        patch = conversion_patch(current, {'before_type': 'Issue', 'after_type': 'User Story'})
        self.assertEqual(patch, [{'op': 'test', 'path': '/rev', 'value': 5},
            {'op': 'add', 'path': '/fields/System.WorkItemType', 'value': 'User Story'},
            {'op': 'add', 'path': '/fields/System.State', 'value': 'Active'}])

    def test_completed_work_stays_completed(self):
        current = {'id': 28, 'rev': 3, 'fields': {'System.WorkItemType': 'Task', 'System.State': 'Done'}}
        self.assertEqual(conversion_patch(current, {'before_type': 'Task', 'after_type': 'Task'})[-1]['value'], 'Closed')

    def test_replay_has_no_state_writes(self):
        current = {'id': 27, 'rev': 6, 'fields': {'System.WorkItemType': 'User Story', 'System.State': 'Resolved'}}
        self.assertEqual(conversion_patch(current, {'before_type': 'Issue', 'after_type': 'User Story'}), [])

    def test_reparent_preserves_other_relations(self):
        current = {'id': 27, 'rev': 6, 'relations': [
            {'rel': 'Hyperlink', 'url': 'https://github.com/example/repo'},
            {'rel': 'System.LinkTypes.Hierarchy-Reverse', 'url': 'https://dev.azure.com/example/_apis/wit/workItems/26'},
            {'rel': 'System.LinkTypes.Dependency-Reverse', 'url': 'https://dev.azure.com/example/_apis/wit/workItems/32'}]}
        patch = parent_patch(current, 26, 88, 'https://dev.azure.com/example')
        self.assertEqual(patch[0], {'op': 'test', 'path': '/rev', 'value': 6})
        self.assertEqual(patch[1], {'op': 'remove', 'path': '/relations/1'})
        self.assertEqual(len(patch), 3)
        with self.assertRaises(WikiError):
            parent_patch(current, 99, 88, 'https://dev.azure.com/example')


if __name__ == '__main__':
    unittest.main()
