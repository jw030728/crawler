import { Crawler } from "./crawler";
import { Browser } from "./browser";

export class CrawlerCoordinator {
    private urlQueue: string[];
    private browser: Browser;

    public constructor() {
        this.urlQueue = [];
        this.browser = new Browser();
    }

    public getBrowser(): Browser {
        return this.browser;
    }

    public reportUrl(url: string): void {
        this.urlQueue.push(url);
    }

    public async start(): Promise<void> {
        while (this.urlQueue) {
            const url = this.urlQueue.shift();
            if (!url) { //url비어있으면 넘김
                continue;
            }
            const crawler = new Crawler(url, this);
            await crawler.trip();
        }
    }
}