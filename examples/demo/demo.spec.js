import { test, expect } from '@playwright/test';

test('basic test of home page', async ({ page }) => {
	await page.goto('http://localhost:8080/');
	await expect(page.locator('text=This is the home page').first()).toBeVisible();
	await expect(page.locator('text=Count: 0').first()).toBeVisible();
	await page.click('text=+');
	await expect(page.locator('text=Count: 1').first()).toBeVisible();
});

test('basic test of navigating to About page', async ({ page }) => {
	await page.goto('http://localhost:8080/');
	await page.click('text=About');
	expect(page.url()).toBe('http://localhost:8080/about');
});

test('basic test of navigating to Error page', async ({ page }) => {
	await page.goto('http://localhost:8080/');
	await page.click('text=Error');
	expect(page.url()).toBe('http://localhost:8080/error');
	await expect(page.locator("text=It's gone")).toBeVisible();
});
