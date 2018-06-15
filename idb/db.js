
let storeDBConnection;
let removeDBConnection;
let selectDBConnection;
let idbVersion = 1;
let request = this.indexedDB.open('idbdb', idbVersion);
request.onupgradeneeded = function (event) {
  let contentDB = event.target.result;

  for (let i in schema) {
    if (!contentDB.objectStoreNames.contains(i)) {
        let config = { keyPath: schema[i].keyPath };
        if(config.keyPath === 'id') {
            config.autoIncrement = true;
        } 
      let store = contentDB.createObjectStore(i, config);
      createNewIndex(store, i);

    } else {
      // This is the scenario in which table exists and then we check for indices to be added
      let tx = event.target.transaction;
      let store = tx.objectStore(i);
      createNewIndex(store, i);
    }
  }

  function createNewIndex(store, i) {
    for (let j in schema[i].indexedFields) {
      if (!(store.indexNames.contains(schema[i].indexName[j]))) {
        store.createIndex(schema[i].indexName[j], schema[i].indexedFields[j], {
          unique: schema[i].isIndexUnique[j]
        });
      }
    }
  }

};

request.onsuccess = function (event) {
  request.result.close();
};

request.onerror = function (event) {
};

function storeData(section, data, cb) {
    if (!storeDBConnection) {
        let request = this.indexedDB.open('idbdb', idbVersion);
        request.onsuccess = (event) => {
            storeDBConnection = event.target.result;
            this.insert(section, data, cb);
        };
    } else {
        this.insert(section, data, cb);
    }
}

function removeData(section, data, cb) {
    if (!removeDBConnection) {
        let request = this.indexedDB.open('idbdb', idbVersion);
        //on error
        request.onsuccess = (event) => {
            removeDBConnection = event.target.result;
            this.delete(section, data, cb);
        };
    } else {
        this.deleteD(section, data, cb);
    }
}

function select(section, data, cb) {
    if (!selectDBConnection) {
        let request = this.indexedDB.open('idbdb', idbVersion);
        request.onsuccess = (event) => {
            selectDBConnection = event.target.result;
            this.find(section, data, cb);
        };
    } else {
        this.find(section, data, cb);
    }
}

function insert(section, data, cb) {
    let transaction = storeDBConnection.transaction(section, 'readwrite');
    let store = transaction.objectStore(section);
    let i = 0;

    putNext();

    function putNext() {
        if (i < data.length) {
            let putOperation = store.put(data[i]);
            putOperation.onsuccess = putNext;
            putOperation.onerror = function (error) {

            };
            ++i;
        } else { // complete
            cb({ result: 'Done' });
        }
    }
}

function deleteD(section, data, cb) {
    let transaction = removeDBConnection.transaction(section, 'readwrite'); //versionchange
    let store = transaction.objectStore(section);
    let del = store.delete(data.id);

    del.onsuccess = function (e) {
        return cb({ result: 'Done' });
    };
    del.onerror = function (e) {
        return cb({ error: true, code: 'DB_ERR', message: event.target.error.name });
    };
}

function find(section, data, cb) {
    if (selectDBConnection.objectStoreNames.contains(section)) {
        let transaction = selectDBConnection.transaction(section, 'readonly');
        let store = transaction.objectStore(section);
        let ob;

        // TODO: support for composite indices
        try {

            // doesn't support multiple keys in data,
            // if multiplpe keys are provided, first key is taken for evaluation
            // if no keys are provided, then first unique key from schema is used for evaluation via 'default'
            // empty object is handled via unique index + getAll

            let key = Object.keys(data);

            let getQueryOnIndex = {

                'id': function (indexName, indexVal) {
                    if (indexName === 'sessSeatInfo') {
                        return store.index(indexName).get(indexVal);
                    }
                    return store.index(indexName).get(Number(indexVal));
                },
                'booking_id': function (indexName, indexVal) {
                    return store.index(indexName).get(indexVal);
                },
                'ssn_instance_id': function (indexName, indexVal) {
                    return store.index(indexName).getAll(Number(indexVal));
                },
                'isOnline': function (indexName, indexVal) {
                    return store.index(indexName).getAll(Number(data.isOnline));
                },
                'status': function (indexName, indexVal) {
                    return store.index(indexName).getAll(Number(data.status));
                },
                'tele_book_no': function (indexName, indexVal) {
                    return store.index(indexName).getAll(indexVal);
                },
                'phone_number': function (indexName, indexVal) {
                    return store.index(indexName).get(Number(indexVal));
                },
                'default': function (indexName) {
                    return store.index(indexName).getAll();
                },
                status_code: function (indexName, indexVal) {
                    return store.index(indexName).get(indexVal);
                },
                payment_mode: function (indexName, indexVal) {
                    return store.index(indexName).get(indexVal);
                },
            };

            if (!key.length) {
                let indexName = schema[section].indexName[schema[section].isIndexUnique.indexOf(true)];
                ob = getQueryOnIndex['default'](indexName);
            } else if (key.length && (schema[section].indexedFields.indexOf(key[0]) !== -1)) {
                key = key[0];
                let indexName = schema[section].indexName[schema[section].indexedFields.indexOf(key)];
                let indexVal = data[key];

                // if (!indexVal) {
                if (indexVal === undefined || indexVal === null) {
                    throw 'Unsupported value provided to fetch data';
                }
                ob = getQueryOnIndex[key](indexName, indexVal);
            } else {
                throw 'No valid Index found to fetch data';
            }

        } catch (e) {
            return cb({ error: true, code: 'DB_ERR', message: 'IDB error : ' + e });
        }

        ob.onsuccess = function (e) {
            if (typeof e.target.result === 'undefined') {
                return cb({ __ndf: true, message: 'No Data Found' });
            }
            for (let i = e.target.result.length - 1; i >= 0; i--) e.target.result[i].is_enabled === 0 && e.target.result.splice(i, 1); // This check should be removed once we have code in place to avoid entries with is_enabled = 0
            return cb({ result: e.target.result });
        };
        ob.onerror = function (e) {
            return cb({ error: true, code: 'DB_ERR', message: e.target.error });
        };
    } else {
        if (!this.deleteIDBFlag) {
            this.deleteIDBFlag = false;
            if (confirm('Do you wish to force clear IndexedDB ?') == true) {
                var DBDeleteRequest = window.indexedDB.deleteDatabase('POS_DB');
                DBDeleteRequest.onerror = function (event) {
                    console.log('Error deleting database.');
                };
                DBDeleteRequest.onsuccess = function (event) {
                    window.location.reload();
                };
            }
        }
        this.deleteIDBFlag = true;
        return cb({ error: true, code: 'DB_ERR', message: event });
    }
}