# LinkedIn Job Hunt Scraper - Apify Actor

A specialized, high-performance web crawler and scraper designed to scrape public job postings from LinkedIn without requiring authentication. It uses the **Crawlee** and **Cheerio** libraries to quickly crawl search listings, extract structural job details, and save them in structured formats like JSON, CSV, or Excel.

It is pre-configured to search for design roles (Graphic Design, UI/UX, social media, print media, etc.) across the Greater Toronto Area (Toronto, Markham, Durham Region in Ontario, Canada) posted in the last 24 hours, but can be configured for any roles and locations.

---

## Features

- **No Authentication Required**: Uses public Guest APIs and endpoints, removing the risk of account bans.
- **24-Hour Post Filter**: Restricts crawls to job postings added within the last 24 hours to ensure you only get active, fresh leads.
- **Customizable Keywords**: Search for lists of roles (e.g. `Graphic Designer`, `UI/UX designer`, `Social Media Designer`, and more).
- **Targeted Geography**: Supports specific city/region level locations (e.g., `Toronto`, `Markham`, `Durham Region`).
- **Detailed Extraction**:
  - Job Title & Company Name
  - Job Location
  - Date Posted (Relative/Absolute)
  - Detailed Job Description (HTML and Clean text)
  - Job Criteria (Employment type, Seniority Level, Industry, Job Function)
- **State-saving Limit**: Limits requests to your exact target number (e.g., scrape exactly 50 jobs) using Apify's Key-Value store state.
- **Fallback Integrity**: Robust fallbacks that salvage basic details from list cards if the scraper encounters rate limiting on individual job pages.

---

## Input Configuration

You can configure inputs directly in the Apify Console user interface:

- **`jobTitles`** (Array of Strings): A list of job positions to search. (e.g., `["Graphic Designer", "UI/UX Designer", "Designer"]`).
- **`locations`** (Array of Strings): Geographic locations to target. (e.g., `["Toronto, Ontario, Canada", "Markham, Ontario, Canada"]`).
- **`maxJobs`** (Integer): The overall maximum number of job listings to extract.
- **`postedPast24hOnly`** (Boolean): Filters postings to only include jobs added in the last 24 hours (uses `f_TPR=r86400`).
- **`proxyConfiguration`** (Object): Select proxy settings to prevent blocking (recommended to use Apify proxies).

### Example Input JSON

```json
{
  "jobTitles": [
    "Graphic Designer",
    "UI/UX Designer",
    "Designer",
    "Social Media Designer",
    "Junior Designer",
    "Print Media Designer"
  ],
  "locations": [
    "Toronto, Ontario, Canada",
    "Markham, Ontario, Canada",
    "Durham Region, Ontario, Canada"
  ],
  "maxJobs": 50,
  "postedPast24hOnly": true,
  "proxyConfiguration": {
    "useApifyProxy": true
  }
}
```

---

## Output Data Structure

Below is an example of the data generated for each job listing inside the Apify dataset:

```json
{
  "jobId": "3928172938",
  "url": "https://www.linkedin.com/jobs/view/3928172938",
  "title": "Graphic Designer",
  "company": "Design Studio Inc.",
  "location": "Toronto, Ontario, Canada",
  "postedTime": "12 hours ago",
  "searchKeyword": "Graphic Designer",
  "searchLocation": "Toronto, Ontario, Canada",
  "criteria": {
    "seniorityLevel": "Associate",
    "employmentType": "Full-time",
    "jobFunction": "Design and Art/Creative",
    "industries": "Marketing and Advertising"
  },
  "descriptionText": "We are seeking a highly creative Graphic Designer to join our team...",
  "descriptionHtml": "<div><p>We are seeking a highly creative <strong>Graphic Designer</strong> to...</p></div>",
  "scrapedAt": "2026-05-27T16:56:00.000Z"
}
```

---

## Deployment & Setup

### Step 1: Push Code to your GitHub Repository
Initialize the repository on your local machine and push the generated code:
```bash
git clone https://github.com/dk7300/job_hunt.git
cd job_hunt

# Copy the generated folder contents into your job_hunt repository, then:
git add .
git commit -m "feat: Initialize LinkedIn Job Hunt Scraper Actor"
git push origin main
```

### Step 2: Connect to Apify
1. Go to the [Apify Console](https://console.apify.com).
2. Click **Create new Actor** -> Select **Link Git repository**.
3. Provide your repository URL: `https://github.com/dk7300/job_hunt.git`
4. Click **Create & Build**.
5. Once built, run the scraper and check the **Dataset** tab to download your results!
