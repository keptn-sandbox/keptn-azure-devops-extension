import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Prepare Keptn Env task tests', function () {

    before( function() {

    });

    after(() => {

    });
	
	it('must create a project', function(done: MochaDone) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'createproject.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

	    assert.equal(tr.succeeded, true, 'should have succeeded');
		assert.equal(tr.stdout.indexOf('configure monitoring') >= 0, false, "monitoring should not be configured just yet");
		
	    done();
	});

	it('must add resources', function(done: MochaDone) {
		this.timeout(10000);

		let tp = path.join(__dirname, 'addresources.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);

		assert.equal(tr.succeeded, true, 'should have succeeded');
		assert.equal(tr.stdout.indexOf('configure monitoring') >= 0, true, "monitoring must be configured");
		assert.equal(tr.stdout.indexOf('demo-slo.yaml to keptn target slo.yaml') >= 0, true, "slo resource must be uploaded");
		assert.equal(tr.stdout.indexOf('demo-sli.yaml to keptn target dynatrace/sli.yaml') >= 0, true, "sli resource must be uploaded");
	    
	    done();
	});
    
});
