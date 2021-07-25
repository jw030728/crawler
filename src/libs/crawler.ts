import axios, { AxiosError } from "axios";

export class Crawler {
    private url: string;
    private content?: string;

    public constructor(url: string) {
        this.url = url;
    }

    //처리되면 문자열|null을 줌
    private async fetch(): Promise<string | null> {
        try {
            const { data } = await axios.get(this.url, {
                timeout: 3000,  //시간제한 3초
            });
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
        //내가 원하는 값을 줄지 안줄지 기다리는중 await
        const result = await this.fetch();
        if (result) {
            console.log(result);
            this.content = result;
        }
        else {
            console.log("Failed to get url data");

        }
    }
}