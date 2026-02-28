import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    try {
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
        await page.goto('http://localhost:3000/login');

        // Fill login just in case
        console.log('Typing credentials...');
        await page.type('input[type="email"]', 'faculty@test.com').catch(() => { });
        await page.type('input[type="password"]', 'password123').catch(() => { });
        await page.click('button[type="submit"]').catch(() => { });

        console.log('Waiting for network idle...');
        await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 }).catch(() => { });

        console.log('Navigating to faculty/exams directly...');
        await page.goto('http://localhost:3000/faculty/exams');

        // wait a bit for react to render
        await new Promise(r => setTimeout(r, 2000));

    } catch (err) {
        console.error("Puppeteer Script Error:", err);
    } finally {
        await browser.close();
    }
})();
