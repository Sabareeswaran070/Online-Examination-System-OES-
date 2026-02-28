import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE EXCEPTION:', err.toString());
    });

    console.log('Navigating to login...');
    await page.goto('http://localhost:5173/login');

    // Login first
    await page.type('input[type="email"]', 'faculty@test.com'); // We will just capture errors, we might need a real login if the error appears AFTER login.
    await page.type('input[type="password"]', 'password123'); // Adjust to your default faculty
    await page.click('button[type="submit"]');

    await page.waitForNavigation({ waitUntil: 'networkidle0' }).catch(() => { });

    console.log('Navigating to exams...');
    await page.goto('http://localhost:5173/faculty/exams');

    await new Promise(r => setTimeout(r, 2000));

    await browser.close();
})();
