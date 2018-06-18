var base = {
		select: function mySelect(opt, cb) {	
		if (opt && opt.data) {
			let conditions = Object.keys(opt.data);
			if (conditions.length > 1) {
				cb({ code: 'NOT_SUPPORTED', message: 'Currently only single indexes are supported' });
			}
			let condition = conditions[0];
			if (Array.isArray(opt.data[condition])) {
				// Array provided
				if (!opt.data[condition].length) {
					return cb({ result: [] });
				}
				let done = [];
				return async.eachLimit(opt.data[condition], 5, async.apply(selectFromDB, opt.table, condition, done), async.apply(asyncCB, done));
			} else {
				// only one entry for condition
				return select(opt.table, opt.data, cb);
			}
		}
		function selectFromDB(table, conditionKey, done, id, callback) {
			select(table, { [conditionKey]: id }, (res) => {
				if (res.__ndf && res.message === 'No Data Found') {
					return callback();
				} else if (res.error && res.code === 'DB_ERROR') {
					return callback(res);
				}
				done.push(res.result);
				return callback();
			});
		}
		function asyncCB(done, err) {
			if (err) {
				return cb(err);
			}
			return cb({ result: done });
		}
    },
    remove: function myRemove(opt, cb) {
        if (opt.data.id instanceof Array) {
          if (!opt.data.id.length) {
            return cb({ error: true, code: 'BASE_JS_DB_ERROR', message: 'No Id Provided to delete' });
          }
          // TODO: check for unique ids
          let done = [];
          let failed = [];
          return async.each(opt.data.id, iterateeFunc, asyncCB);
          function iterateeFunc(id, callback) {
            removeData(opt.table, { id: id }, (res) => {
              if (res.error) {
                failed.push(id);
                return callback();
              }
              done.push(id);
              return callback();
            });
          }
          function asyncCB() {
            return cb({ result: { done: done, failed: failed } });
          }
        }
        return removeData(opt.table, opt.data, cb);
      }
}