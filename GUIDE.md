# Guide to internet and cloud services

[Español](GUIDE.es.md)

This guide explains **how to read a cloud offer without being fooled**. The concrete data lives in `data/`; what is here are the ideas you need to interpret it.

It is written so that someone without a technical background can follow it. If something is hard to understand, that is a defect of the guide, not of the reader.

---

## First: two things people mix up

### A pool is not a cap

This is the most important distinction in the whole document, and the one that costs the most money and time.

- A **pool** is a monthly total that you spend however you like. If you are given 180,000 vCPU-seconds per month, you can use them on one extremely long operation or on a million short ones. It makes no difference how you split them.
- A **per-request cap** is a maximum that no single operation can exceed, **even if you have the whole month left over**.

A real example: Cloudflare Workers' free plan gives 10 milliseconds of CPU **per request**. Verifying a password with strong hashing takes about 33 milliseconds. Result: sign-in always fails, even though the rest of the month is untouched. With a monthly pool of the same total size, nothing would have happened.

When you compare plans, always ask: **is this a pool or a cap?**

### GB is not always GB

- A **GB** (gigabyte) is 1 billion bytes.
- A **GiB** (gibibyte) is 1,073,741,824 bytes.

The difference is 7.4%. Different providers use one or the other for the same product, so comparing without checking which one each uses introduces a silent error.

---

## The four ways to limit

| Form | What it means | Where it hurts |
|---|---|---|
| **Monthly pool** | A total for the month, splittable as you please | Nowhere, as long as the total lasts |
| **Per-request cap** | A maximum per individual operation | Expensive operations **always** fail |
| **Daily cap** | A pool that refills every day | A spike locks you out until tomorrow |
| **Concurrency cap** | How many things at once, with no total limit | At peak hours |

---

## The ten service families

1. **Compute** — where your code runs. From renting a whole computer to paying per millisecond of execution.
2. **Storage** — where your files live. Cheap to fill, almost always expensive to empty.
3. **Databases** — where your structured, related data lives.
4. **Networking and delivery** — how your service reaches the people who use it: traffic, domains, certificates, protection.
5. **Communication** — how your system talks to people: email, SMS, voice, video, notifications.
6. **Identity and security** — who gets in and what they can do.
7. **Development and operations** — how you build, publish and watch over what you made.
8. **Content and application** — ready-made product pieces: search, maps, payments, images.
9. **Artificial intelligence** — services that interpret or generate text, voice and images.
10. **Orchestration** — what runs, when, and in what order.

The detail of the 71 types is in `data/types.json` and in the generated page.

---

## The nine ways to charge

They answer the question “how often does this have to be paid?”.

| Pricing model | How it works |
|---|---|
| **Perpetual free** | Free with no end date, within certain limits |
| **Monthly renewable quota** | Each month you get the same amount again; unused amounts do not carry over |
| **Daily renewable quota** | Resets every day, usually at midnight UTC |
| **One-time credit** | A gift of money that, when it runs out, is gone |
| **Time-limited free** | Free for N months, then it is charged or the account is closed |
| **Time subscription** | Fixed price, however much you use |
| **Metered usage** | You pay for what you consume, with no minimum |
| **Base plus overage** | A fee that includes some consumption, and a rate above it |
| **Per transaction** | A commission on each operation |

Watch the difference between **perpetual free** and **time-limited free**: both are advertised as a “free tier”.

---

## The thirteen pitfalls

All of them found while verifying real offers, not hypothetical ones.

1. **The per-request cap disguised as a pool.** See above. It is number one for a reason.
2. **Egress is almost never free.** Putting data in is usually free; taking it out is charged. And the price varies a lot by region: leaving from South America can cost six times more than from the United States.
3. **GiB ≠ GB.** A silent 7.4% difference.
4. **Free databases that expire.** Render's free PostgreSQL is deleted 30 days after it is created. “Free” and “permanent” are different things.
5. **Accounts that close themselves.** Since July 2025, the AWS free plan's account closes after six months.
6. **Quotas cut without notice.** Oracle reduced its free tier from 4 OCPU/24 GB to 2 OCPU/12 GB in August 2026, with no public announcement. People found out when their machines were switched off.
7. **Minimum retention in cold storage.** Storing is very cheap; deleting early is charged anyway, and retrieving costs money and hours.
8. **“Free” that demands a card.** Koyeb holds 29 USD to verify it; Oracle demands a real card, neither virtual nor prepaid. Cloudflare asks for none. If your cards are frequently rejected, this decides more than the price.
9. **Scale to zero means cold start.** Paying only for use means the first visit after a quiet spell waits for the service to wake up: up to a minute on some free plans.
10. **The quota is per account, not per service.** Two applications in the same account share the same free tier.
11. **Regional markups, and tables that already come with a region.** The same machine in São Paulo costs 30% to 40% more than in Virginia. Worse still, some providers publish a price table that **differs by region**, so the figures you are reading may not be yours. Fly.io is the clear case among those compared here; its recorded prices correspond to Amsterdam.
12. **“Per month” does not always mean a ceiling.** For most providers the monthly price is a ceiling: however long the machine runs, you pay no more. But whoever bills per second usually publishes as “month” the 30-day equivalent, and a real month has 30.4. Fly.io works this way: its implied hours hover around 720 against the 613–672 of the others, that is, almost no discount for leaving the machine on.
13. **Free without guarantees.** Microsoft explicitly says its App Service free plan “is not supported for production workloads”. No free plan has an SLA.

---

## How to compare two offers, in order

1. **What type of service is it?** Look the type up in `data/types.json`: it tells you what units it is measured in.
2. **Convert to the same unit.** If one gives OCPU-hours and another vCPU-seconds, convert them to the same thing. One OCPU performs roughly like two vCPUs.
3. **Check whether it is a pool or a cap.** A small cap can make the service unusable even when the total is generous.
4. **Look for the egress.** If it does not appear in the comparison, the cost that surprises people most is missing.
5. **Check whether it expires** and whether it requires a card.
6. **Look at the verification date.** If it is more than three months old, go back to the source before deciding.

### Beware of summary ratios

It is tempting to reduce a product line to one number, such as “dollars per GB of RAM per month”. Two warnings:

- **A ratio does not represent the whole line.** Within a single family the best and the worst tier can differ quite a lot: in Hetzner's CPX line it goes from 6.75 USD per GB on the entry plan to 5.12 on the largest, and at Linode the Nanode works out at 5.00 while the rest of the range sits at 6.00. If you quote a single number, say **which plan it came from**; better still, give the range.
- **The ratio of one resource ignores the others.** The worst values per GB of RAM tend to be plans where you pay for extra CPU, not for memory: DigitalOcean's 2 vCPU and 2 GiB plan comes to 9.00 USD per GB precisely because the second core is charged there. It is not a bad plan; it is a plan aimed at something else.

---

## Why this guide distrusts aggregators

During the research that produced this data, an aggregator of free tiers aimed at AI agents was consulted. Its Google Cloud entry was accurate. The other two that were cross-checked afterwards were not:

- **Azure**: it classified the free SQL database as a 12-month offer when Microsoft documents that it lasts for the **lifetime of the subscription**. An error that would have discarded Azure's best feature for the case being evaluated.
- **DigitalOcean**: it put the Functions free tier at 25,000 GiB-seconds per month. The official page says **90,000**, three and a half times more. Here the error went the other way: it would have made you discard as too small a tier that actually covers 720,000 invocations of a lightweight function.

The conclusion is not “aggregators lie” but something more useful: **they are good for discovering options, not for deciding**. That is why every row in `data/offers.json` carries its URL and a `confidence` field that distinguishes what was confirmed in official documentation from what was not.
