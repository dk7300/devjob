import { createCheerioRouter } from '@crawlee/cheerio';
import { Actor } from 'apify';

export const router = createCheerioRouter();

// 1. ROUTE: Crawl list of job search results
router.addHandler('LIST', async ({ $, request, crawler, log }) => {
    const { title, location, start, postedPast24hOnly } = request.userData;
    
    // Each search result is represented as a list item (li)
    const jobItems = $('li');
    log.info(`[LIST] Found ${jobItems.length} job cards for "${title}" in "${location}" (start: ${start})`);

    if (jobItems.length === 0) {
        log.info(`[LIST] Reached the end of job listings for "${title}" in "${location}".`);
        return;
    }

    // Access state tracking from Key-Value store
    const store = await Actor.openKeyValueStore();
    let enqueuedCount = (await store.getValue('ENQUEUED_COUNT')) || 0;
    const maxJobs = (await store.getValue('MAX_JOBS')) || 50;

    if (enqueuedCount >= maxJobs) {
        log.info(`[LIST] Already enqueued maximum targeted jobs (${enqueuedCount}/${maxJobs}). Stopping search.`);
        return;
    }

    let enqueuedFromThisPage = 0;

    // Iterate through list items to extract Job IDs and initiate detail requests
    for (const item of jobItems.toArray()) {
        if (enqueuedCount >= maxJobs) break;

        const card = $(item);

        // Extract Job ID from entity URN or Link URL
        let jobId = '';
        const entityUrn = card.find('[data-entity-urn]').attr('data-entity-urn') || card.find('.base-card').attr('data-entity-urn');
        if (entityUrn) {
            const match = entityUrn.match(/jobPosting:(\d+)/);
            if (match) jobId = match[1];
        }

        // Fallback: extract ID from target URL regex
        if (!jobId) {
            const href = card.find('a.base-card__full-link').attr('href');
            if (href) {
                const match = href.match(/view\/.*?-(\d+)/) || href.match(/view\/(\d+)/) || href.match(/jobPosting\/(\d+)/);
                if (match) jobId = match[1];
            }
        }

        if (jobId) {
            const detailUrl = `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`;

            // Extract baseline card metadata to use as fallbacks in case page structures shift or rate-limits occur
            const listTitle = card.find('.base-search-card__title').text().trim();
            const listCompany = card.find('.base-search-card__subtitle, .base-search-card__subtitle a').text().trim();
            const listLocation = card.find('.job-search-card__location').text().trim();
            const listDate = card.find('time').attr('datetime') || card.find('time').text().trim();

            await crawler.requestQueue.addRequest({
                url: detailUrl,
                userData: {
                    label: 'DETAIL',
                    jobId,
                    listTitle,
                    listCompany,
                    listLocation,
                    listDate,
                    searchTitle: title,
                    searchLocation: location,
                },
            });

            enqueuedCount++;
            enqueuedFromThisPage++;
        }
    }

    // Save updated count to store
    await store.setValue('ENQUEUED_COUNT', enqueuedCount);
    log.info(`[LIST] Added ${enqueuedFromThisPage} job detail tasks. Total enqueued: ${enqueuedCount}/${maxJobs}`);

    // If there were cards on this page, and we haven't hit the target limit, fetch the next set (pagination)
    if (enqueuedCount < maxJobs && jobItems.length >= 20) {
        const nextStart = start + 25;
        const timeFilter = postedPast24hOnly ? '&f_TPR=r86400' : '';
        const nextUrl = `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?keywords=${encodeURIComponent(title)}&location=${encodeURIComponent(location)}${timeFilter}&start=${nextStart}`;

        await crawler.requestQueue.addRequest({
            url: nextUrl,
            userData: {
                label: 'LIST',
                title,
                location,
                start: nextStart,
                postedPast24hOnly,
            },
        });
    }
});

// 2. ROUTE: Extract full details from job Posting page fragment
router.addHandler('DETAIL', async ({ $, request, log }) => {
    const { jobId, listTitle, listCompany, listLocation, listDate, searchTitle, searchLocation } = request.userData;

    log.info(`[DETAIL] Processing detailed job page for ID: ${jobId}`);

    // Try parsing selectors from the job details fragment
    let title = $('.top-card-layout__title, .topcard__title, h1').first().text().trim();
    let company = $('.topcard__org-name-link, .top-card-layout__org-name-link, .top-card-layout__decorator a, .topcard__org-name').first().text().trim();
    let location = $('.topcard__flavor--bullet, .top-card-layout__flavor--bullet, .top-card-layout__flavor').first().text().trim();
    let postedTime = $('.posted-time-ago__text, .top-card-layout__flavor--metadata, .topcard__flavor--metadata').first().text().trim();

    // Clean whitespace and layouts
    location = location.replace(/\s+/g, ' ').trim();
    postedTime = postedTime.replace(/\s+/g, ' ').trim();

    // Leverage list card data fallbacks if guest detail page loading was restricted or layout changed
    if (!title) title = listTitle;
    if (!company) company = listCompany;
    if (!location) location = listLocation;
    if (!postedTime) postedTime = listDate;

    // Extract Description content (support HTML tags for display, and clean text for search indexing)
    const descriptionHtml = $('.show-more-less-html__markup').html()?.trim() || '';
    const descriptionText = $('.show-more-less-html__markup, #job-details').text().replace(/\s+/g, ' ').trim() || '';

    // Extract Job Metadata (Employment type, Seniority, Industries, Functions)
    const criteria = {};
    $('.description__job-criteria-item, .job-criteria__item').each((_, el) => {
        const header = $(el).find('.description__job-criteria-subheader, .job-criteria__subheader').text().trim();
        const value = $(el).find('.description__job-criteria-text, .job-criteria__text').text().trim();
        if (header && value) {
            const key = header.toLowerCase().replace(/[^a-z0-9]+(.)/g, (m, chr) => chr.toUpperCase()).replace(/[^a-zA-Z0-9]/g, '');
            criteria[key] = value.replace(/\s+/g, ' ');
        }
    });

    // Reconstruct direct URL
    const jobUrl = `https://www.linkedin.com/jobs/view/${jobId}`;

    const jobData = {
        jobId,
        url: jobUrl,
        title,
        company,
        location,
        postedTime,
        searchKeyword: searchTitle,
        searchLocation,
        criteria,
        descriptionText,
        descriptionHtml,
        scrapedAt: new Date().toISOString(),
    };

    // Save detailed results to default dataset
    await Actor.pushData(jobData);
    log.info(`[SAVED] "${title}" at "${company}" (${location})`);
});
