#!/usr/bin/env node
// Written by Eric Crosson
// 2017-11-07

const _ = require('lodash');
const coinmarketcap = require('coinmarketcap-cli-api');
const stripAnsi = require('strip-ansi');
const Table = require('markdown-table');
const CliTable = require('cli-table2');
const regexp_quote = require('regexp-quote');

const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');



client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    console.log(`\nIncoming command: '${message.content}'`);
    const match = message.content.match(new RegExp(/^.(.*?)\s(.*)$/), '');
    const command = match[1];
    const coin = match[2];
    console.log(`Command: '${command}'`);
    console.log(`Coin: '${coin}'`);

    switch(command) {
    case "marketcap":
    case "coinmarketcap":

        market = '';
        marketcap = '';
        promises = [];

        promises.push(coinmarketcap.getMarkets(coin)
                      .then(function(markets) {
                          market = markets
                      }));
        promises.push(coinmarketcap.getMarketCap(coin)
                      .then(function(marketcaps) {
                          marketcap = marketcaps[0]
                      }));

        // TODO: add error handling (coin not found)
        // TODO: host on a forever home
        Promise.all(promises)
            .then(function() {

                var marketData = []
                _.each(market, function(exchange, index) {

                    const marketShare = parseFloat(exchange['Volume (%)'].split("%")[0]);

                    // Limit this list to 10 entries
                    if (index >= 10) return;
                    // Don't display dust entries (small market share)
                    if (marketShare < 3) return;

                    console.log(exchange);
                    marketData.push({name: `${exchange['Exchange']}`,
                                     value: `Pair: ${exchange['Pair']}\nVolume (%): ${exchange['Volume (%)']}\nPrice: ${exchange['Price']}`});
                });
                message.channel.send({embed: {
                    title: `${marketcap['Currency']} market leaders by volume`,
                    description: `Total market cap: ${marketcap['Market cap']}`,
                    url: `https://coinmarketcap.com/currencies/${marketcap['Currency'].toLowerCase().replace(/\s+/,'-')}/#markets`,
                    fields: marketData
                }});
            })
        break;
    }
});

client.login(config.token);
