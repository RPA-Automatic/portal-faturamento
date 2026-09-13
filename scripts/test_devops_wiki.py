import json
import tempfile
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from publish_devops_wiki import WikiError, load_pages, publish


class WikiPublisherTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        (self.root / 'wiki/product').mkdir(parents=True)
        (self.root / 'wiki/product.md').write_text('# Produto')
        (self.root / 'wiki/product/Architecture.md').write_text('# Arquitetura')
        (self.root / 'wiki/Other.md').write_text('Não publicar')
        self.cfg = self.root / 'config.json'
        self.cfg.write_text(json.dumps({'organization': 'https://dev.azure.com/example',
            'project': 'Shared', 'project_id': 'project-id', 'wiki_id': 'wiki-id', 'page_root': '/product'}))
        self.remote = {}
        self.writes = []

    def transport(self, method, url, auth, body=None, headers=None):
        if '/pages?' not in url:
            return 200, {'id': 'wiki-id', 'projectId': 'project-id'}, {}
        path = parse_qs(urlparse(url).query)['path'][0]
        if method == 'GET':
            return (200, {'content': self.remote[path]}, {'ETag': 'revision-1'}) if path in self.remote else (404, {}, {})
        self.writes.append((path, headers))
        self.remote[path] = body['content']
        return 201, {}, {}

    def test_only_product_tree_is_published_and_second_run_is_unchanged(self):
        publish(self.cfg, True, self.transport, 'test')
        self.assertEqual(set(self.remote), {'/product', '/product/Architecture'})
        self.assertTrue(all(h == {'If-None-Match': '*'} for _, h in self.writes))
        self.writes.clear()
        result = publish(self.cfg, True, self.transport, 'test')
        self.assertEqual(self.writes, [])
        self.assertTrue(all(p['action'] == 'unchanged' for p in result['pages']))

    def test_plan_never_writes(self):
        publish(self.cfg, False, self.transport, 'test')
        self.assertEqual(self.writes, [])

    def test_existing_content_requires_matching_revision(self):
        self.remote['/product'] = 'Old'
        publish(self.cfg, True, self.transport, 'test')
        self.assertEqual(self.writes[0], ('/product', {'If-Match': 'revision-1'}))

    def test_wrong_project_blocks_before_writes(self):
        def wrong(*args, **kwargs):
            return 200, {'id': 'wiki-id', 'projectId': 'wrong'}, {}
        with self.assertRaises(WikiError):
            publish(self.cfg, True, wrong, 'test')
        self.assertFalse(self.writes)

    def test_missing_etag_aborts_entire_preflight(self):
        self.remote['/product/Architecture'] = 'Existing'
        def missing(*args, **kwargs):
            status, body, headers = self.transport(*args, **kwargs)
            return status, body, {}
        with self.assertRaises(WikiError):
            publish(self.cfg, True, missing, 'test')
        self.assertFalse(self.writes)

    def test_symlink_cannot_publish_outside_content(self):
        outside = self.root / 'private.md'
        outside.write_text('Private')
        (self.root / 'wiki/product/Secret.md').symlink_to(outside)
        with self.assertRaises(WikiError):
            load_pages(self.cfg)


if __name__ == '__main__':
    unittest.main()
