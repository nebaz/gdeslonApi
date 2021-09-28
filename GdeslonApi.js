const fetch = require('node-fetch');
const parseString = require('xml2js').parseStringPromise;
const GDESLON_API_URL = 'https://www.gdeslon.ru/api/orders/';
const GDESLON_API_LINKS_URL = 'https://www.gdeslon.ru/api/users/shops.xml?api_token=';
const STATUS_REJECTED = 'rejected';
const STATUS_OPEN = 'open';
const STATUS_HOLD = 'hold';
const STATUS_APPROVED = 'approved';
const STATUS_PAID = 'paid';

class GdeslonApi {

  static STATUS_REJECTED = STATUS_REJECTED;
  static STATUS_OPEN = STATUS_OPEN;
  static STATUS_HOLD = STATUS_HOLD;
  static STATUS_APPROVED = STATUS_APPROVED;
  static STATUS_PAID = STATUS_PAID;

  constructor(username, password, xmlApiToken = '') {
    this.username = username;
    this.password = password;
    this.xmlApiToken = xmlApiToken;
  }

  toGdeslonFormatDate(timestamp) {
    let mm = new Date(timestamp).getMonth() + 1;
    let dd = new Date(timestamp).getDate();
    return [new Date(timestamp).getFullYear(), (mm > 9 ? '' : '0') + mm, (dd > 9 ? '' : '0') + dd].join('-');
  }

  async getLeadsByOfferId(dateFrom, dateTo, offerId = null, channelId = null, subAccount = null) {
    let params = {
      created_at: {
        date: this.toGdeslonFormatDate(dateFrom),
        period: (dateTo - dateFrom) / (1000 * 3600 * 24)
      }
    };
    if (offerId) {
      params.merchant_id = offerId;
    }
    if (subAccount) {
      params.sub_id = subAccount;
    }
    let result = await this.apiRequest(params);
    if (result && Array.isArray(result)) {
      result.map(item => {
        item.orderId = item.gdeslon_order_id.toString();
        item.subaccount1 = item.sub_id1;
        item.subaccount2 = item.sub_id2;
        item.offerId = Number(item.merchant_id);
        item.offerName = item.merchant_name;
        item.status = this.getLeadStatus(item.state);
        item.commission = Number(item.partner_payment);
        item.leadTime = item.created_at ? new Date(item.created_at).valueOf() : null;
        item.uploadTime = item.confirmed_at ? new Date(item.confirmed_at).valueOf() : null;
      });
      return result;
    }
    return false;
  }

  /**
   * short grouped statistics by offer
   * @return items{offerId,clickCount,leadsOpen}
   */
  async getStatisticsOffersByOfferId(dateFrom, dateTo, offerId = null, subAccount = null) {
    let apiData = await this.getLeadsByOfferId(dateFrom, dateTo, offerId, null, subAccount);
    if (apiData && Array.isArray(apiData)) {
      let result = {
        offerId: offerId,
        clicks: 0,  // gdeslon not support
        backUrlCount: 0,  // gdeslon not support
        leadsRejected: 0,
        leadsOpen: 0,
        leadsApproved: 0,
        commissionRejected: 0,
        commissionOpen: 0,
        commissionApproved: 0
      };
      for (let item of apiData) {
        switch (item.status) {
          case STATUS_REJECTED:
            result.leadsRejected++;
            result.commissionRejected = Number((result.commissionRejected + item.commission).toFixed(2));
            break;
          case STATUS_OPEN:
          case STATUS_HOLD:
            result.leadsOpen++;
            result.commissionOpen = Number((result.commissionOpen + item.commission).toFixed(2));
            break;
          case STATUS_APPROVED:
          case STATUS_PAID:
            result.leadsApproved++;
            result.commissionApproved = Number((result.commissionApproved + item.commission).toFixed(2));
            break;
        }
      }
      return result;
    }
    return false;
  }

  async getWebmasterCommissions(dateFrom, dateTo, offerId = null) {
    let apiData = await this.getLeadsByOfferId(dateFrom, dateTo, offerId);
    let commissionOpen = 0;
    let commissionApproved = 0;
    let commissionRejected = 0;
    let paid = 0;
    for (let item of apiData) {
      switch (item.status) {
        case STATUS_REJECTED:
          commissionRejected = Number((commissionRejected + item.commission).toFixed(2));
          break;
        case STATUS_OPEN:
        case STATUS_HOLD:
          commissionOpen = Number((commissionOpen + item.commission).toFixed(2));
          break;
        case STATUS_APPROVED:
          commissionApproved = Number((commissionApproved + item.commission).toFixed(2));
          break;
        case STATUS_PAID:
          paid = Number((paid + item.commission).toFixed(2));
          break;
      }
    }
    return {commissionRejected, commissionOpen, commissionApproved, paid};
  }

  async getOfferLinks(offerId = null) {
    let xml = await (await fetch(GDESLON_API_LINKS_URL + this.xmlApiToken)).text();
    if (!this.xmlApiToken) {
      throw new Error('no gdeslon token');
    }
    let parsedXml = await parseString(xml);
    let result = [];
    for (let shop of parsedXml['shops']['shop']) {
      result.push({
        offerId: Number(shop['id']),
        offerLink: shop['affiliate-link'][0],
        shopName: shop['name'][0].toLowerCase()
      });
    }
    return result;
  }

  async getOfferLinkByOfferId(offerId) {
    if (!offerId) {
      return false;
    }
    let links = await this.getOfferLinks();
    for (let link of links) {
      if (offerId == link.offerId) {
        return link.offerLink;
      }
    }
  }

  /**
   0 - новый
   1 - отменен
   2 - отложен
   3 - подтвержден
   4 - выплачен
   */
  getLeadStatus(status) {
    switch (status) {
      case 0:
        return STATUS_OPEN;
      case 1:
        return STATUS_REJECTED;
      case 2:
        return STATUS_HOLD;
      case 3:
        return STATUS_APPROVED;
      case 4:
        return STATUS_PAID;
      default:
        return status;
    }
  }

  async apiRequest(params) {
    let result;
    try {
      result = await (await fetch(GDESLON_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(this.username + ':' + this.password).toString('base64')
        },
        body: JSON.stringify(params)
      })).json();
    } catch(e) {
      console.error('gdeslon api error', e);
      return false;
    }
    return result;
  }

}

module.exports = GdeslonApi;
