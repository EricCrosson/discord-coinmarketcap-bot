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
    case "mcap":
    case "marketcap":
    case "coinmarketcap":

        var promises = [];
        var coin;

        var market = '';
        var marketcap = '';
        var totalmarketcap = 0;

        let match = message.content.match(new RegExp(/^.(\S+)\s*(.*)$/), '');
        console.log(match);
        if (match[2] === '') {
            // no arguments provided: list top 10 market caps
            promises.push(coinmarketcap.getMarketCaps()
                          .then(function(marketcaps) {
                              marketcap = marketcaps.slice(0, 10);
                              totalmarketcap = _.reduce(marketcaps, function(sum, market) {
                                  const mcap = parseInt(market['Market cap'].replace(/[$,]/g,''), 10);
                                  if (isNaN(mcap)) return sum;
                                  return sum + mcap;
                              }, 0);
                          }));

            Promise.all(promises)
                .then(function() {

                    let marketData = _.reduce(marketcap, function(sum, market) {
                        // Limit this list to 10 entries
                        if (sum.length >= 10) return sum;
                        let mcap =  parseFloat(market['Market cap'].replace(/[$,]/g,''), 10) * 100;
                        sum.push({name: `${market['Market cap rank']}. ${market['Currency']} (${market['Symbol']})`,
                                  value: `Market cap: ${market['Market cap']} (${(mcap/totalmarketcap).toFixed(2)}%)`});
                        return sum;
                    }, []);
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
            // TODO: respond to help
            console.log(`Coin: '${coin}'`);

            promises.push(coinmarketcap.getMarkets(coin)
                          .then(function(markets) {
                              market = markets
                          }));
            promises.push(coinmarketcap.getMarketCap(coin)
                          .then(function(marketcaps) {
                              // TODO: stop API from return a list of one
                              marketcap = marketcaps[0];
                          }));

            // TODO: add error handling (coin not found)
            // TODO: host on a forever home
            Promise.all(promises)
                .then(function() {

                    let marketData = _.reduce(market, function(sum, data) {
                        const marketShare = parseFloat(data['Volume (%)'].replace('%',''));
                        // Limit this list to 10 entries
                        if (sum.length >= 10) return sum;
                        // Don't display dust entries (small market share)
                        if (marketShare < 3) return sum;

                        console.log(data);
                        console.log(sum);
                        sum.push({name: `${data['Exchange']}`,
                                  value: `Pair: ${data['Pair']}\nVolume (%): ${data['Volume (%)']}\nPrice: ${data['Price']}`});
                        return sum;
                    }, []);
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
