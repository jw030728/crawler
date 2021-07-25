import { Crawler } from "./libs/crawler";

(async () => {
    //주어진 주소로 탐색 
    const crawler = new Crawler("http://naver.com/dszfdghfjgkhl");
    //crawler.trip()을 비동기 처리
    await crawler.trip();
})();