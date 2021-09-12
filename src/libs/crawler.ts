//import axios, { AxiosError } from "axios";
import { CrawlerCoordinator } from "./crawlerCoordinator";
import { parse } from "node-html-parser";
// import iconv from "iconv-lite";
import chardet from "chardet";
// import { Script } from "vm";
import { KMR } from "koalanlp/API";
import { Tagger } from "koalanlp/proc";
import { Keyword } from "../models/Keyword";
import { Link } from "../models/Link";
import { KeywordLink } from "../models/KeywordLink";
// import { initialize } from "koalanlp/Util";

export class Crawler {
    private url: string;
    private content?: string;   //js 바이트배열을 묶어서 관리하는 객체 buffer
    //  private encoding?: string;
    private coordinator: CrawlerCoordinator;
    private host?: string;

    public constructor(url: string, coordinator: CrawlerCoordinator) {
        this.url = url;
        this.coordinator = coordinator;
    }

    //처리되면 문자열 or null을 줌
    private async fetch(): Promise<string | null> {
        //코디네이터에 있던 브라우저를 통해 getInstance
        const browser = await this.coordinator.getBrowser().getInstance();
        if (!browser) {
            return null;
        }
        const page = await browser.newPage();//페이지띄우기
        await page.goto(this.url);//그리고 this.url로 이동
        const result = await page.content();//페이지 로딩될때까지 기달리고 띄우기

        if (result) {
            this.content = result;
            return this.content;
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
        if (!this.content) {
            return;
        }
        const html = parse(this.content).querySelector("body");//body태그
        const anchors = html.querySelectorAll("a");//a태그

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
            //상대경로 처리
            if (url.startsWith("/")) url = this.host + url;
            else if (!href.startsWith("http")) url = this.host + "/" + url;

            //this.coordinator.reportUrl(url);
        });
        html.querySelectorAll("script").forEach((script) => script.remove());

        const text = html.text.replace(/\s{2,}/g, " ");
        await this.parseKeywords(text);//형태소분석
    }

    private async parseKeywords(text: string) {
        const tagger = new Tagger(KMR);
        const tagged = await tagger(text);
        const newKeywords: Set<string> = new Set();
        const existKeywords: Keyword[] = [];

        for (const sent of tagged) {
            for (const word of sent._items) {
                for (const morpheme of word._items) {
                    const t = morpheme._tag;
                    //nng 명사 찾기 등..
                    if (t === "NNG" || t === "NNP" || t === "NNB" ||
                        t === "NP" || t === "NR" || t === "VV" || t === "SL") {
                        const keyword = morpheme._surface.toLowerCase();
                        const exist = await Keyword.findOne({//찾고 
                            where: {
                                name: keyword,
                            },
                        });
                        if (!exist) {//없으면 추가
                            newKeywords.add(keyword);
                        } else {
                            existKeywords.push(exist);
                        }
                    }
                    //      {
                    //     //검색 후 조건에 맞는게 없으면 추가
                    //     const exist = await Keyword.findOne({
                    //         where: {
                    //             name: morpheme._surface,
                    //         },
                    //     });
                    //     if (!exist) {
                    //         await Keyword.create({
                    //             name: morpheme._surface,
                    //         });
                    //     }
                    // }
                    // try {    //중복처리
                    //     await Keyword.create({
                    //         name: morpheme._surface,
                    //     });
                    // }
                    // catch (e) {
                    //     console.log("duplicated or error occurred", e);
                    // }

                }
            }
        }
        let newLink;
        if (newKeywords.size > 0) {//데이터가 있으면
            const keywords = Array.from(newKeywords).map((keyword) => {
                return { name: keyword };
            });
            newLink = await Link.create(//링크를만들고
                {
                    url: this.url,
                    description: text.slice(0, 512),
                    keywords: keywords,//키워드만들고
                },
                {
                    include: [Keyword],
                }
            );
        }
        if (newLink) {
            const addedIds: Set<bigint> = new Set();
            for (const keyword of existKeywords) {
                if (!addedIds.has(keyword.id)) {//관계를 만들어주기
                    await KeywordLink.create({
                        keywordId: keyword.id,
                        linkId: newLink.id,
                    });
                    addedIds.add(keyword.id);
                }
            }
        }
    }
}