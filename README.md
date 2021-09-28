# Gdeslon API Integration

## Installation

To use the library, install it through [npm](https://npmjs.com)

```shell
npm install --save gdeslonapi
```

## Get API tokens
* https://www.gdeslon.ru/api_settings/orders - for get orders
* https://www.gdeslon.ru/api_settings/xml - for get links

## Usage
    const GdeslonApi = require('gdeslonapi');
    const api = new GdeslonApi(wmId, ordersApiToken, xmlApiToken);
    const links = await api.getOfferLinks();

## API
* getLeadsByOfferId(timestamp dateFrom, timestamp dateTo, int offerId, string subAccount): Array< Object >
* getStatisticsOffersByOfferId(timestamp dateFrom, timestamp dateTo, int offerId, string subAccount): Object
* getWebmasterCommissions(timestamp dateFrom, timestamp dateTo, int offerId): Object
* getOfferLinks(int offerId): Array< Object >
* getOfferLinkByOfferId(int offerId): String
* apiRequest(params) - native gdeslon api request
