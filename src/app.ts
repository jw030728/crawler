import { CrawlerCoordinator } from "./libs/crawlerCoordinator";
import { parse } from "node-html-parser";

// const text = `<body>
// <a href="https://naver.com">hello</a>
// <div>sdfdsfsf</div>
// <a href="https://kakao.com">world</a>
// </body>`;

// const matched = text.match(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1>/i);
// console.log(matched);
// const multipleMatched = text.match(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1>/g);
// console.log(multipleMatched);

// const html = parse(text);
// console.log(html.querySelector("a"));

(async () => {
    const coordinator = new CrawlerCoordinator();
    coordinator.reportUrl("http://news.naver.com");
    await coordinator.start();
})();