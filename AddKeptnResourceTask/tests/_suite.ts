import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Add Resource to Keptn task tests', function () {

    before( function() {

    });

    after(() => {

    });

	it.skip('must add a resource to keptn', function(done: MochaDone) {
		this.timeout(125000);

		let tp = path.join(__dirname, 'addresource.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);
	    assert.equal(tr.failed, false, 'should fail');
	    assert.equal(tr.warningIssues.length, 0, "should have no warning");
	    assert.equal(tr.errorIssues.length, 0, "should have no errors");
		
	    done();
	});  
});