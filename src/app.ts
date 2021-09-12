import { CrawlerCoordinator } from "./libs/crawlerCoordinator";
import { initialize } from "koalanlp/Util";
import database from "./config/database";

(async () => {
    database.sync({
        alter: true,
    });

    // 형태소분석기 시작할때 한번 초기화 
    await initialize({
        packages: { KMR: "2.0.4", KKMA: "2.0.4" },
        verbose: true,
    });

    //coordinator 하나만 만듬 
    const coordinator = new CrawlerCoordinator();
    coordinator.reportUrl("http://news.naver.com");
    await coordinator.start();
})();