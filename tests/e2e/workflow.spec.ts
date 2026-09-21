import { test, expect } from '@playwright/test';
test('analyze, select, pause, resume, complete, filter history, delete', async ({
  page,
  request,
}) => {
  // Tests use their own SQLite database; see README before running against another server.
  await request.delete('/api/downloads');
  const queue = await (await request.get('/api/downloads')).json();
  for (const item of queue.data) await request.delete(`/api/downloads/${item.id}`);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'One link. Every format.' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Media URL' }).fill('not-a-url');
  await page.getByRole('button', { name: 'Analyze link' }).click();
  await expect(page.locator('#url-error')).toBeVisible();
  await page.getByRole('button', { name: /Cinematic video/ }).click();
  await expect(page.getByRole('heading', { name: 'Somewhere, beyond the ordinary' })).toBeVisible();
  await page.getByLabel('Download format').selectOption('mp4-720');
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await page.getByRole('button', { name: 'Pause download' }).click();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  const before = await (await request.get('/api/downloads')).json();
  await page.waitForTimeout(1700);
  const after = await (await request.get('/api/downloads')).json();
  expect(after.data[0].progress).toBe(before.data[0].progress);
  await page.reload();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Resume download' }).click();
  await expect(page.locator('.download-row')).toHaveCount(0, { timeout: 25000 });
  await page.getByRole('link', { name: 'View history' }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('MP4 · 720p')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search downloads' }).fill('no-match');
  await expect(page.getByText('Nothing here just yet')).toBeVisible();
  await page.getByRole('textbox', { name: 'Search downloads' }).fill('Somewhere');
  await page.getByLabel('Filter by platform').selectOption('Instagram');
  await expect(page.getByText('Nothing here just yet')).toBeVisible();
  await page.getByLabel('Filter by platform').selectOption('YouTube');
  await page.getByLabel('Filter by media type').selectOption('video');
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  const stats = await (await request.get('/api/stats')).json();
  expect(stats.data.total).toBe(1);
  expect(stats.data.videos).toBe(1);
  expect(stats.data.bytes).toBe(25165824);
  await page.getByRole('button', { name: 'Delete record' }).click();
  await expect(page.getByText('Nothing here just yet')).toBeVisible();
  expect((await (await request.get('/api/stats')).json()).data.total).toBe(0);
});
test('failed demo can be retried and history can be cleared', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Test retry/ }).click();
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await expect(page.getByText('Failed', { exact: true })).toBeVisible({ timeout: 20000 });
  await page.getByRole('button', { name: 'Retry download' }).click();
  await expect(page.getByText('Failed', { exact: true })).toHaveCount(0);
  await expect(page.locator('.download-row')).toHaveCount(0, { timeout: 25000 });
  await page.getByRole('link', { name: 'View history' }).click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear history', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Clear history', exact: true })
    .click();
  await expect(page.getByText('Nothing here just yet')).toBeVisible();
});
test('API rejects invalid inputs and format spoofing with consistent errors', async ({
  request,
}) => {
  for (const [url, data, status] of [
    ['/api/analyze', { url: 'javascript:alert(1)' }, 400],
    ['/api/download', { url: 'https://instagram.com/p/demo', formatId: 'mp4-1080' }, 400],
  ] as const) {
    const response = await request.post(url, { data });
    expect(response.status()).toBe(status);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.data).toBe(null);
    expect(typeof body.error).toBe('string');
  }
  expect((await request.delete('/api/downloads/does-not-exist')).status()).toBe(404);
  expect((await request.get('/api/downloads?provider=Invalid')).status()).toBe(400);
});
test('desktop and mobile views fit the viewport', async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto('/');
    await expect(page.getByRole('button', { name: /Cinematic video/ })).toBeVisible();
    await expect(page.locator('.skeleton')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Download history', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `test-results/downloader-${width}.png`, fullPage: true });
  }
});

test('audio and image formats update the overview, and dialogs support Escape', async ({
  page,
  request,
}) => {
  await request.delete('/api/downloads');
  await page.goto('/');
  await page.getByRole('button', { name: /Ambient audio/ }).click();
  await expect(page.getByLabel('Download format').locator('option')).toHaveCount(2);
  await page.getByLabel('Download format').selectOption('m4a');
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await expect(page.getByRole('status')).toContainText('Added to your queue');
  await page.getByRole('button', { name: /Photography/ }).click();
  await expect(page.getByLabel('Download format').locator('option')).toHaveCount(2);
  await page.getByLabel('Download format').selectOption('png');
  await page.getByRole('button', { name: 'Add to queue' }).click();
  await expect(page.locator('.download-row')).toHaveCount(2);
  const queued = (await (await request.get('/api/downloads')).json()).data;
  expect(queued.filter((item: { status: string }) => item.status === 'processing')).toHaveLength(1);
  expect(queued.find((item: { status: string }) => item.status === 'queued').progress).toBe(0);
  await expect
    .poll(async () => (await (await request.get('/api/stats')).json()).data.total, {
      timeout: 45000,
    })
    .toBe(2);
  const stats = (await (await request.get('/api/stats')).json()).data;
  expect(stats.audio).toBe(1);
  expect(stats.images).toBe(1);
  expect(stats.bytes).toBe(11534336);
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Your media. By the numbers.' })).toBeVisible();
  await expect(page.locator('.stat-card').filter({ hasText: 'Downloaded data' })).toContainText(
    '11.0 MB',
  );
  await page.getByRole('button', { name: 'Help & information' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await request.delete('/api/downloads');
});

test('network failures produce a useful error and analysis can recover', async ({ page }) => {
  await page.goto('/');
  await page.route('**/api/analyze', (route) => route.abort());
  await page.getByRole('button', { name: /Cinematic video/ }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Unable to reach The Chain' }),
  ).toBeVisible();
  await page.unroute('**/api/analyze');
  await page.getByRole('button', { name: 'Analyze link' }).click();
  await expect(page.getByRole('button', { name: 'Add to queue' })).toBeVisible();
});
