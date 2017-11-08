#!/usr/bin/env node
// Written by Eric Crosson
// 2017-11-07

'use strict;'

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
    let match = message.content.match(new RegExp(/^.(\S+).*$/), '');
    const command = match[1];
    console.log(`Command: '${command}'`);

    switch(command) {
    case "marketcap":
    case "coinmarketcap":

        var promises = [];
        var coin;

        var market = '';
        var marketcap = '';

        let match = message.content.match(new RegExp(/^.(\S+)\s*(.*)$/), '');
        console.log(match);
        if (match[2] === '') {
            // no arguments provided: list top 10 market caps
            promises.push(coinmarketcap.getMarketCaps()
                          .then(function(marketcaps) {
                              marketcap = marketcaps.slice(0, 10);
                          }));

            Promise.all(promises)
                .then(function() {

                    let marketData = []

                    _.each(marketcap, function(market, index) {

                        // Limit this list to 10 entries
                        if (index >= 10) return;

                        marketData.push({name: `${market['Market cap rank']}. ${market['Currency']} (${market['Symbol']})`,
                                         value: `Market cap: ${market['Market cap']}`});
                    });

                    var totalmarketcap = _.reduce(marketcap, function(sum, market) {
                        return sum + parseInt(market['Market cap'].replace(/[$,]/g,''), 10);
                    }, 0);

                    message.channel.send({embed: {
                        title: `Cryptocurrency market leaders`,
                        description: `Total crypto market cap: $${totalmarketcap.toLocaleString()}`,
                        url: `https://coinmarketcap.com/all/views/all/`,
                        fields: marketData
                    }});
                });
        } else {
            // argument given: currency-lookup
            coin = match[2];
            console.log(`Coin: '${coin}'`);

            promises.push(coinmarketcap.getMarkets(coin)
                          .then(function(markets) {
                              market = markets
                          }));
            promises.push(coinmarketcap.getMarketCap(coin)
                          .then(function(marketcaps) {
                              marketcap = marketcaps[0]
                              console.log(marketcaps[0]);
                          }));

            // TODO: add error handling (coin not found)
            // TODO: host on a forever home
            Promise.all(promises)
                .then(function() {

                    let marketData = []
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
                        description: `Total market cap: ${marketcap['Market cap']}\nMarket cap rank: ${marketcap['Market cap rank']}`,
                        url: `https://coinmarketcap.com/currencies/${marketcap['Currency'].toLowerCase().replace(/\s+/,'-')}/#markets`,
                        fields: marketData
                    }});
                })
        }

        break;
    }
});

client.login(config.token);
