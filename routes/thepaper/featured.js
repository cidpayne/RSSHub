const cheerio = require('cheerio');
const dayjs = require('dayjs');
const url = require('url');
const axios = require('../../utils/axios');

module.exports = async (ctx) => {
    const axios_ins = axios.create({
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A356 Safari/604.1',
        },
    });

    const link = 'https://m.thepaper.cn/';

    const res = await axios_ins.get(link);

    const data = res.data;
    const $ = cheerio.load(data);
    const list = $('p.news_tit01, div.news_tit02')
        .slice(0, 10)
        .get();

    const out = await Promise.all(
        list.map(async (item) => {
            const $ = cheerio.load(item);
            const itemUrl = url.resolve(
                link,
                $(item)
                    .find('a')
                    .attr('href')
            );
            const cache = await ctx.cache.get(itemUrl);
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }
            const res = await axios_ins.get(itemUrl);
            const content = cheerio.load(res.data);
            const serverOffset = new Date().getTimezoneOffset() / 60;
            const single = {
                title: $(item)
                    .find('a')
                    .text(),
                guid: itemUrl,
                link: itemUrl.replace('https://m.', 'https://'),
                description: content('#v3cont_id > div.news_content > div.news_part_father > div > div:nth-child(1)').html(),
                pubDate: content('#v3cont_id > div.news_content > p:nth-child(3)').html()
                    ? dayjs(
                          content('#v3cont_id > div.news_content > p:nth-child(3)')
                              .html()
                              .split('&#xA0;')[0]
                      )
                          .add(-8 - serverOffset, 'hour')
                          .toISOString()
                    : null,
                author: content('#v3cont_id > div.news_content > p:nth-child(2)').text(),
            };
            return Promise.resolve(single);
        })
    );

    ctx.state.data = {
        title: '澎湃新闻 - 首页头条',
        link,
        item: out,
    };
};
