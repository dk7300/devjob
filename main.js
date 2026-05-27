import { Actor } from 'apify';
import { CheerioCrawler } from '@crawlee/cheerio';
import { router } from './routes.js';

// Initialize the Apify SDK
await Actor.init();

// Retrieve configuration input
const input = await Actor.getInput();

if (!input) {
    console.error('Error: Input configuration is missing.');
    await Actor.exit();
}

const {
    jobTitles = ["Graphic Designer"],
    locations = ["Toronto, ON"],
    maxJobs = 50,
    postedPast24hOnly = true,
    proxyConfiguration: proxyConfig,
} = input;

// Store configuration in Key-Value store to track global counts across requests
const store = await Actor.openKeyValueStore();
await store.setValue('ENQUEUED_COUNT', 0);
await store.setValue('MAX_JOBS', maxJobs);

// Create proxy configuration
const proxyConfiguration = await Actor.createProxyConfiguration(proxyConfig);

// Setup the Cheerio crawler
const crawler = new CheerioCrawler({
    proxyConfiguration,
    // Keep concurrency low to prevent LinkedIn from blocking requests immediately
    minConcurrency: 1,
    maxConcurrency: 2,
    requestHandler: router,
    requestHandlerTimeoutSecs: 40,
    // Add simple retry logic
    maxRequestRetries: 3,
});

// Seed the crawler with search combinations
const initialRequests = [];

for (const title of jobTitles) {
    for (const location of locations) {
        // Construct the LinkedIn public search API endpoint for lists of jobs
        const timeFilter = postedPast24hOnly ? '&f_TPR=r86400' : '';
        const searchUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}${timeFilter}&start=0`;
        
        initialRequests.push({
            url: searchUrl,
            userData: {
                label: 'LIST',
                title,
                location,
                start: 0,
                postedPast24hOnly,
            },
        });
    }
}

console.log(`[START] Initializing crawl for ${initialRequests.length} search combinations.`);
console.log(`[CONFIG] Max job postings target: ${maxJobs}. Last 24 hours only: ${postedPast24hOnly}`);

await crawler.run(initialRequests);

console.log('[COMPLETED] Crawling finished! All extracted LinkedIn job listings are saved in the dataset.');

// Exit Actor process
await Actor.exit();
