import axios, { AxiosError } from "axios";
import { CrawlerCoordinator } from "./crawlerCoordinator";
import { parse } from "node-html-parser";

export class Crawler {
    private url: string;
    private content?: string;
    private coordinator: CrawlerCoordinator;
    private host?: string;

    public constructor(url: string, coordinator: CrawlerCoordinator) {
        this.url = url;
        this.coordinator = coordinator;
    }

    //처리되면 문자열 or null을 줌
    private async fetch(): Promise<string | null> {
        try {
            const { data, request } = await axios.get(this.url, {
                timeout: 3000,  //시간제한 3초
            });
            this.host = request.host;
            return data; //html로 받아서 data는 string
        }
        catch (error) {
            //response에 값이 있고 에러뜨면 status코드 띄움 
            if (error.isAxiosError) {
                const e: AxiosError = error;
                console.log(e.response?.status);
            }
        }
        return null;
    }

    public async trip(): Promise<void> {
        //await 하던일을 계속 기다리기만하면 다른걸 하도록 해주는거
        const result = await this.fetch();
        if (result) {
            this.content = result;
            await this.parseContent();
        }
        else {
            console.log("Failed to get url data");
        }
    }

    //anchors테이블에 a tag에서 href속성값(링크) 빼오기
    private async parseContent(): Promise<void> {
        if (!this.content) {
            return;
        }
        //a tag찾기
        const html = parse(this.content);
        const anchors = html.querySelectorAll("a");

        anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href');//href속성값 
            if (!href) {
                return;
            }
            const matched = href.match(
                /^(((http|ftp|https):\/\/)|(\/))*[\w-]+(\.[\w-]+)*([\w.,@?^=%& amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?/i
            );
            if (!matched) {
                return null;
            }

            let url = matched[0];

            if (url.startsWith("/")) url = this.host + url;
            else if (!href.startsWith("http")) url = this.host + "/" + url;
            //console.log(url);

            // this.coordinator.reportUrl(url);
        });
        console.log(html.text.replace(/\s{2,}/g, " "));
    }
}