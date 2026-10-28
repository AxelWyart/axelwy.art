import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const home = await readFile(new URL('index.html', root), 'utf8');
const filenames = (await readdir(new URL('case-studies/', root))).filter((name) => name.endsWith('.html'));
const sitemap = await readFile(new URL('sitemap.xml', root), 'utf8');
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
const tags = (html, name) => [...html.matchAll(new RegExp(`<(?:${name})\\b[^>]*>`, 'g'))].map(([tag]) => tag);
const previews = tags(home, 'a').filter((tag) => /\bdata-case-study\b/.test(tag));

test('every work preview links to a real, separately addressable HTML page', () => {
  assert.equal(previews.length, 11);
  const paths = previews.map((tag) => attribute(tag, 'href')).sort();
  assert.deepEqual(paths, filenames.map((name) => `case-studies/${name}`).sort());
  for (const tag of previews) assert.ok(attribute(tag, 'aria-label'), 'Preview links need an accessible name');
});

const titles = new Set();
for (const filename of filenames) {
  const path = `case-studies/${filename}`;
  const html = await readFile(new URL(path, root), 'utf8');
  const pageURL = new URL(path, root);
  const canonical = `https://www.axelwy.art/${path}`;

  test(`${filename}: indexable content and page-specific metadata exist without JavaScript`, () => {
    const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
    assert.ok(title && !titles.has(title), 'Page titles must be present and unique');
    titles.add(title);
    assert.equal((html.match(/<h1\b/g) || []).length, 1);
    assert.match(html, /<article\b[^>]*data-case-study-content[^>]*>[\s\S]*<h1\b[^>]*id="case-study-title"[^>]*>[^<]+<\/h1>/);
    assert.match(html, /<p class="case-lede">[^<]+<\/p>/);
    const canonicalTag = tags(html, 'link').find((tag) => attribute(tag, 'rel') === 'canonical');
    assert.equal(attribute(canonicalTag, 'href'), canonical);
    const meta = tags(html, 'meta');
    const description = meta.find((tag) => attribute(tag, 'name') === 'description');
    assert.ok(attribute(description, 'content')?.length > 30);
    assert.equal(attribute(meta.find((tag) => attribute(tag, 'property') === 'og:url'), 'content'), canonical);
    assert.match(attribute(meta.find((tag) => attribute(tag, 'name') === 'robots'), 'content'), /^index, follow/);
    const schema = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema.url, canonical);
    assert.equal(schema.creator.name, 'Axel Wyart');
    assert.ok(sitemap.includes(`<loc>${canonical}</loc>`), 'Crawlable page missing from sitemap');
  });

  test(`${filename}: internal links, images, fonts and styles resolve on a direct visit`, async () => {
    const references = tags(html, 'a|img|source|link').flatMap((tag) => {
      const direct = [attribute(tag, 'href'), attribute(tag, 'src')].filter(Boolean);
      const responsive = (attribute(tag, 'srcset') || '').split(',').filter(Boolean).map((part) => part.trim().split(/\s+/)[0]);
      return [...direct, ...responsive];
    });
    for (const reference of references) {
      if (/^(?:https?:|mailto:|#)/.test(reference)) continue;
      const file = new URL(reference, pageURL);
      file.hash = '';
      file.search = '';
      await access(file);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    assert.equal(new Set(ids).size, ids.length, 'Duplicate IDs in case study');
    const projectNavigation = tags(html, 'a').filter((tag) => /\bdata-case-study\b/.test(tag));
    assert.equal(projectNavigation.length, 2);
    for (const tag of projectNavigation) {
      assert.match(attribute(tag, 'aria-label') || '', /^(Previous|Next) project: .+/,
        'Icon-only project links must announce their direction and destination');
    }
    const image = tags(html, 'img')[0];
    assert.ok(attribute(image, 'alt'));
    assert.ok(attribute(image, 'width') && attribute(image, 'height'));
  });
}
