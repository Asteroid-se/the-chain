import test from 'node:test';
import assert from 'node:assert/strict';
import { detectProvider, urlSchema } from '../src/lib/url';
import { analyzeMedia } from '../src/providers';
test('detects provider domains without trusting lookalikes', () => {
  assert.equal(detectProvider('https://m.youtube.com/watch?v=123'), 'YouTube');
  assert.equal(detectProvider('https://youtu.be/demo'), 'YouTube');
  assert.equal(detectProvider('https://instagram.com/p/demo'), 'Instagram');
  assert.equal(detectProvider('https://vm.tiktok.com/demo'), 'TikTok');
  assert.equal(detectProvider('https://youtube.com.evil.example/video'), 'Generic');
  assert.equal(detectProvider('https://notyoutube.com/video'), 'Generic');
});
test('rejects unsafe protocols, credentials, malformed and oversized URLs', () => {
  for (const url of [
    'not a URL',
    'ftp://example.com/a',
    'file:///etc/passwd',
    'https://user:pass@example.com/',
    `https://example.com/${'a'.repeat(2048)}`,
  ])
    assert.equal(urlSchema.safeParse(url).success, false);
  assert.equal(urlSchema.safeParse('https://example.com/video.mp4').success, true);
});
test('demo adapters expose relevant formats with explicit demo metadata', async () => {
  const image = await analyzeMedia('https://instagram.com/p/demo');
  assert.equal(image.demo, true);
  assert.deepEqual(
    image.formats.map((item) => item.extension),
    ['jpg', 'png'],
  );
  const audio = await analyzeMedia('https://example.com/sound.wav');
  assert.ok(audio.formats.every((item) => item.mediaType === 'audio'));
  const video = await analyzeMedia('https://youtube.com/watch?v=demo');
  assert.ok(video.formats.some((item) => item.quality === '1080p'));
  assert.ok(video.formats.some((item) => item.extension === 'mp3'));
});
