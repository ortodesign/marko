/*
 * Copyright 2011 eBay Software Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * This module provides the runtime for rendering compiled templates.
 *
 *
 * <p>The code for the Raptor Templates compiler is kept separately
 * in the {@link raptor/templating/compiler} module.
 */
'use strict';
var StringBuilder = require('raptor-strings/StringBuilder');
var renderContext = require('raptor-render-context');
var createError = require('raptor-util').createError;
var Context = renderContext.Context;
var helpers = require('./helpers');
var loader = require('./loader');
require('./context-helpers');

var cache = {};

module.exports = {

    Context: Context,
    
    render: function (templatePath, data, callback, context) {
        if (typeof callback !== 'function') {
            // A callback function was provided
            context = callback;
            callback = null;
        }

        var isTopLevelContext;
        var attributes = context.attributes;

        if (!attributes.async) {
            isTopLevelContext = true;
            attributes.async = {
                remaining: 0,
                firstPassComplete: true
            };
        }
        else {
            isTopLevelContext = false;
        }

        if (!context) {
            isTopLevelContext = true;
            context = new Context(new StringBuilder());
        }

        var templateFunc = cache[templatePath];
        if (!templateFunc) {
            templateFunc = cache[templatePath] = loader(templatePath)(helpers);
        }
        
        try {
            templateFunc(data || {}, context);    //Invoke the template rendering function with the required arguments
        } catch (e) {
            // context.emit('error', e);
            throw createError(new Error('Unable to render template with name "' + templatePath + '". Exception: ' + e), e);
        }

        if (callback) {
            context
                .on('end', function() {
                    callback(null, context.getOutput());
                })
                .on('error', callback);
        }

        if (isTopLevelContext && attributes.async.remaining === 0) {
            context.emit('end');
        }

        return context;
    },
    unload: function (templatePath) {
        delete cache[templatePath];
    },
    createContext: function(writer) {
        return new Context(writer);
    },
    helpers: helpers
};

