#!/usr/bin/env node
// Written by Eric Crosson
// 2017-11-07

'use strict;'

const _ = require('lodash');
const coinmarketcap = require('coinmarketcap-cli-api');
const imgur = require('imgur');
const webshot = require('webshot');

const Discord = require('discord.js');
const client = new Discord.Client();
const config = require('./config.json');

const crypto_mkcap_dominance_png = 'crypto-mkcap-dominance.png';

// TODO: why does input 'eth' not work? something's getting snagged
// TODO: refactor the photo-fetching into the coinmarketcap-api library


client.on('ready', () => {
    console.log('I am ready!');
});

client.on('message', message => {
    if (!message.content.startsWith(config.prefix) || message.author.bot) return;

    console.log(`\nIncoming command: '${message.content}'`);
    let match = message.content.match(new RegExp(/^.(\S+).*$/), '');
    console.log(`Match: '${match}'`);
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
        let imageUrl = '';
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

            promises.push(new Promise(function(resolve, reject) {
                let options = {
                    shotSize: {width: 1000, height: 752},
                    shotOffset: {left: 25, right: 0, top: 1650, bottom: 0}
                };
                webshot('https://coinmarketcap.com/charts/', crypto_mkcap_dominance_png, options, function(err) {
                    if (err) { reject() }
                    // upload image to imgur
                    imgur.uploadFile(crypto_mkcap_dominance_png)
                        .then(function(json) {
                            imageUrl = json.data.link;
                            resolve();
                        }).catch(function(err) { console.log(err) });
                })
            }))

            Promise.all(promises)
                .then(function() {
                    let embed = new Discord.RichEmbed()
                        .setTitle('Cryptocurrency market leaders')
                        .setDescription(`Total crypto market cap: $${totalmarketcap.toLocaleString()}`)
                        .setURL('https://coinmarketcap.com/all/views/all/')

                    _.each(marketcap, (market) => {
                        let mcap = parseFloat(market['Market cap'].replace(/[$,]/g,''), 10) * 100;
                        embed.addField(`${market['Market cap rank']}. ${market['Currency']} (${market['Symbol']})`,
                                       `Market cap: ${market['Market cap']} (${(mcap/totalmarketcap).toFixed(2)}%)`)
                    })
                    embed.setImage(imageUrl)
                    message.channel.send({embed});
                });
        } else {
            // argument given: currency-lookup
            coin = match[2];
            // TODO: respond to help
            console.log(`Coin: '${coin}'`);

            promises.push(coinmarketcap.getMarkets(coin)
                          .then(function(markets) {market = markets}));
            // TODO: stop API from return a list of one
            promises.push(coinmarketcap.getMarketCap(coin)
                          .then(function(marketcaps) {marketcap = marketcaps[0];}));


            // TODO: add error handling (coin not found)
            // TODO: host on a forever home
            Promise.all(promises)
                .then(function() {

                    let options = {
                        shotSize: {width: 1000, height: 662},
                        shotOffset: {left: 12, right: 0, top: 742, bottom: 0}
                    };
                    let photoURL = `https://coinmarketcap.com/currencies/${marketcap['Currency'].toLowerCase().replace(/\s+/,'-')}`
                    webshot(photoURL,
                            crypto_mkcap_dominance_png, options, function(err) {
                                if (err) { throw err }
                                // upload image to imgur
                                imgur.uploadFile(crypto_mkcap_dominance_png)
                                    .then(function(json) {
                                        imageUrl = json.data.link;

                                        let embed = new Discord.RichEmbed()
                                            .setTitle(`${marketcap['Currency']} market leaders by volume`)
                                            .setDescription(`Total market cap: ${marketcap['Market cap']}\nMarket cap rank: ${marketcap['Market cap rank']}`)
                                            .setURL(`https://coinmarketcap.com/currencies/${marketcap['Currency'].toLowerCase().replace(/\s+/,'-')}/#markets`)

                                        /// main-y
                                        _.reduce(market, function(sum, data) {
                                            const marketShare = parseFloat(data['Volume (%)'].replace('%',''));
                                            // Limit this list to 10 entries
                                            if (sum.length >= 10) return sum;
                                            // Don't display dust entries (small market share)
                                            if (marketShare < 3) return sum;

                                            console.log(data);
                                            console.log(sum);
                                            embed.addField(`${data['Exchange']}`,
                                                           `Pair: ${data['Pair']}\nVolume (%): ${data['Volume (%)']}\nPrice: ${data['Price']}`);
                                            return sum;
                                        }, []);

                                        embed.setImage(imageUrl)
                                        message.channel.send({embed});
                                        /// main-y end



                                    }).catch(function(err) { throw err });
                            })
                })
        }

        break;
    }
});

client.login(config.token);
