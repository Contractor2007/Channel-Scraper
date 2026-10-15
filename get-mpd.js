const { chromium } = require("playwright");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

const channels = [
    ["Azam One", "https://bosstvmax.uk/player/c065d251-17f0-4b0c-a2f6-81324d609de4"],
    ["Azam Two", "https://bosstvmax.uk/player/84f2883a-349a-49ea-87c8-397c69ad7b07"],
    ["Sinema Zetu", "https://bosstvmax.uk/player/e0abfb81-b109-4600-8b4e-178d3bd14a4b"],
    ["Azam Sports 1 HD", "https://bosstvmax.uk/player/78481dac-331e-4b72-b983-a3107a1b636d"],
    ["Azam Sports 2 HD", "https://bosstvmax.uk/player/73c05c2d-ec03-4cfa-b369-2524928f5773"],
    ["Azam Sports 3 HD", "https://bosstvmax.uk/player/6eeeae28-0fa3-4769-a061-33379c5c4ca5"],
    ["Azam Sports 4 HD", "https://bosstvmax.uk/player/dc002cb7-a900-4445-9ad3-6f4064f319e3"],
];

function waitForMpd(page, timeoutMs = 45_000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            page.off("request", onRequest);
            reject(new Error("No MPD request detected before timeout."));
        }, timeoutMs);

        function onRequest(request) {
            const url = request.url();

            if (/\.mpd(?:$|[?#])/i.test(url)) {
                clearTimeout(timer);
                page.off("request", onRequest);
                resolve(url);
            }
        }

        page.on("request", onRequest);
    });
}

async function main() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Missing Supabase environment variables.");
    }

    const browser = await chromium.launch({ headless: true });

    try {
        const page = await browser.newPage();

        for (const [title, pageUrl] of channels) {
            console.log(`Checking ${title}...`);

            try {
                const mpdPromise = waitForMpd(page);
                await page.goto(pageUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 30_000,
                });

                const mpdUrl = await mpdPromise;

                const { data, error } = await supabase
                    .from("channels")
                    .update({ stream_url: mpdUrl, stream_type: "DASH" })
                    .eq("title", title)
                    .select("title");

                if (error) {
                    console.error(`${title}: Supabase update failed: ${error.message}`);
                } else if (!data?.length) {
                    console.error(`${title}: no database row matched that title.`);
                } else {
                    console.log(`${title}: updated.`);
                }
            } catch (error) {
                console.error(`${title}: ${error.message}`);
            }
        }
    } finally {
        await browser.close();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
