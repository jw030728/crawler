import axios, { AxiosError } from "axios";
import { CrawlerCoordinator } from "./crawlerCoordinator";
import { parse } from "node-html-parser";
import iconv from "iconv-lite";
import chardet from "chardet";
import { Script } from "vm";
import { KMR } from "koalanlp/API";
import { Tagger } from "koalanlp/proc";
import { initialize } from "koalanlp/Util";

export class Crawler {
    private url: string;
    private content?: Buffer;   //js 바이트배열을 묶어서 관리하는 객체 buffer
    private encoding?: string;
    private coordinator: CrawlerCoordinator;
    private host?: string;

    public constructor(url: string, coordinator: CrawlerCoordinator) {
        this.url = url;
        this.coordinator = coordinator;
    }

    //처리되면 문자열 or null을 줌
    private async fetch(): Promise<Buffer | null> {
        try {
            const { data, request } = await axios.get(this.url, {
                timeout: 3000,  //시간제한 3초
                responseType: "arraybuffer", //바이트 배열을 받음
            });
            this.host = request.host;
            const detectEncoding = this.detectEncoding(data);
            if (!detectEncoding) {
                return null;
            }
            this.encoding = detectEncoding; //encoding에 넣어주기
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

    //buffer를 받아서 return 
    private detectEncoding(data: Buffer): string | null {
        return chardet.detect(data);
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
        if (!this.content || !this.encoding) {
            return;
        }
        const encodedContent = iconv.decode(this.content, this.encoding);
        const html = parse(encodedContent);
        //script태그 지우기
        const scripts = html.querySelectorAll("script");
        scripts.forEach(tmp => tmp.remove());
        //a tag찾기
        const anchors = html.querySelectorAll("a");
        anchors.forEach((anchor) => {
            const href = anchor.getAttribute('href');//href속성값 
            if (!href) {
                return;
            }
            const matched = href.match(
                //정규표현식으로 검증
                /^(((http|ftp|https):\/\/)|(\/))*[\w-]+(\.[\w-]+)*([\w.,@?^=%& amp;:/~+#-]*[\w@?^=%&amp;/~+#-])?/i
            );
            if (!matched) {
                return null;
            }

            let url = matched[0];

            if (url.startsWith("/")) url = this.host + url;
            else if (!href.startsWith("http")) url = this.host + "/" + url;

            //this.coordinator.reportUrl(url);
        });
        html.querySelectorAll("script").forEach((script) => script.remove());

        const text = html.text.replace(/\s{2,}/g, " ");
        await this.parseKeywords(text);
    }

    private async parseKeywords(text: string) {
        await initialize({
            packages: { KMR: "2.0.4", KKMA: "2.0.4" },
            verbose: true,
        });

        const tagger = new Tagger(KMR);
        const tagged = await tagger(text);
        for (const sent of tagged) {
            for (const word of sent._items) {
                for (const morpheme of word._itmes) {
                    const t = morpheme._tag;
                    if (t === "NNG" || t === "VV" || t === "MM") {
                        console.log(morpheme.toString());
                    }
                }
            }
        }
    }
}