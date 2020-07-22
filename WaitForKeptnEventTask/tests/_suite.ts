import * as path from 'path';
import * as assert from 'assert';
import * as ttm from 'azure-pipelines-task-lib/mock-test';

describe('Wait for Keptn Event task tests', function () {

    before( function() {

    });

    after(() => {

    });

	it('must wait for evaluationDone', function(done: MochaDone) {
		this.timeout(125000);

		let tp = path.join(__dirname, 'waitfor.js');
	    let tr: ttm.MockTestRunner = new ttm.MockTestRunner(tp);
	
		tr.run();
		
		console.log(tr.succeeded);
		console.log(tr.stdout);
		console.log(tr.stderr);
	    assert.equal(tr.failed, true, 'should fail');
	    assert.equal(tr.warningIssues.length, 0, "should have no warning");
	    assert.equal(tr.errorIssues.length, 1, "should have one error");
		
	    done();
	});  
});