// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

var assert = require('assert');
var util = require('util');

var asn1 = require('asn1');

var LDAPMessage = require('./message');
var Attribute = require('../attribute');
var dn = require('../dn');
var Protocol = require('../protocol');



///--- Globals

var BerWriter = asn1.BerWriter;



///--- API

function SearchEntry(options) {
  if (options) {
    if (typeof(options) !== 'object')
      throw new TypeError('options must be an object');
    if (options.objectName && !(options.objectName instanceof dn.DN))
      throw new TypeError('options.objectName must be a DN');
  } else {
    options = {};
  }

  options.protocolOp = Protocol.LDAP_REP_SEARCH_ENTRY;
  LDAPMessage.call(this, options);

  this.objectName = options.objectName || null;
  this.setAttributes(options.attributes || []);

  var self = this;
  this.__defineGetter__('type', function() { return 'SearchEntry'; });
  this.__defineGetter__('object', function() {
    var obj = {
      dn: self.dn.toString()
    };
    self.attributes.forEach(function(a) {
      obj[a.type] = a.vals.length > 1 ? a.vals.slice() : a.vals[0];
    });
    return obj;
  });
  this.__defineGetter__('_dn', function() {
    return self.objectName;
  });
}
util.inherits(SearchEntry, LDAPMessage);
module.exports = SearchEntry;


SearchEntry.prototype.addAttribute = function(attr) {
  if (!attr || typeof(attr) !== 'object')
    throw new TypeError('attr (attribute) required');

  this.attributes.push(attr);
};


SearchEntry.prototype.setAttributes = function(obj) {
  if (typeof(obj) !== 'object')
    throw new TypeError('object required');

  if (Array.isArray(obj)) {
    obj.forEach(function(a) {
      if (!Attribute.isAttribute(a))
        throw new TypeError('entry must be an Array of Attributes');
    });
    this.attributes = obj;
  } else {
    var self = this;

    self.attributes = [];
    Object.keys(obj).forEach(function(k) {
      var attr = new Attribute({type: k});
      if (Array.isArray(obj[k])) {
        obj[k].forEach(function(v) {
          attr.addValue(v.toString());
        });
      } else {
        attr.addValue(obj[k].toString());
      }
      self.attributes.push(attr);
    });
  }
};


SearchEntry.prototype._json = function(j) {
  assert.ok(j);

  j.objectName = this.objectName.toString();
  j.attributes = [];
  this.attributes.forEach(function(a) {
    j.attributes.push(a.json);
  });

  return j;
};


SearchEntry.prototype._parse = function(ber) {
  assert.ok(ber);

  this.objectName = ber.readString();
  assert.ok(ber.readSequence());
  var end = ber.offset + ber.length;

  while (ber.offset < end) {
    var a = new Attribute();
    a.parse(ber);
    this.attributes.push(a);
  }

  return true;
};


SearchEntry.prototype._toBer = function(ber) {
  assert.ok(ber);

  ber.writeString(this.objectName.toString());
  ber.startSequence();
  this.attributes.forEach(function(a) {
    // This may or may not be an attribute
    ber = Attribute.toBer(a, ber);
  });
  ber.endSequence();

  return ber;
};


