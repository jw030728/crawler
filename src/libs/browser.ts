import { launch, Browser as HeadlessBrowser } from "puppeteer";


export class Browser {
    private browser?: HeadlessBrowser;

    //싱글톤패턴으로 구성
    public async getInstance(): Promise<HeadlessBrowser | null> {
        if (this.browser) {
            return this.browser;
        }
        this.browser = await launch();//프로세스 띄움 크롬브라우저띄움 크롬이기본값

        if (!this.browser) {
            return null;
        }
        return this.browser;
    }
}
