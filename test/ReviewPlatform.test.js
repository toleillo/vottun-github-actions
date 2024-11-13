const ReviewPlatform = artifacts.require("ReviewPlatform");
const { expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { web3 } = require('@openzeppelin/test-helpers/src/setup');

contract("ReviewPlatform", accounts => {
    const [owner, user1, user2] = accounts;
    const postFee = web3.utils.toWei('0.0001', 'ether');
    let reviewPlatform;

    beforeEach(async () => {
        reviewPlatform = await ReviewPlatform.new({ from: owner });
    });

    describe("Deployment", () => {
        it("should set the right owner", async () => {
            const contractOwner = await reviewPlatform.owner();
            assert.equal(contractOwner, owner, "Owner wasn't set correctly");
        });

        it("should set the initial post fee", async () => {
            const initialFee = await reviewPlatform.postFee();
            assert.equal(initialFee.toString(), postFee, "Initial post fee wasn't set correctly");
        });
    });

    describe("Post Fee Management", () => {
        const newFee = web3.utils.toWei('0.0002', 'ether');

        it("should allow owner to update post fee", async () => {
            await reviewPlatform.updatePostFee(newFee, { from: owner });
            const updatedFee = await reviewPlatform.postFee();
            assert.equal(updatedFee.toString(), newFee, "Post fee wasn't updated correctly");
        });

        it("should not allow non-owner to update post fee", async () => {
            await expectRevert(
                reviewPlatform.updatePostFee(newFee, { from: user1 }),
                "Not contract owner"
            );
        });
    });

    describe("Review Management", () => {
        const reviewContent = "This is a test review";

        it("should allow posting a review with sufficient payment", async () => {
            const tx = await reviewPlatform.postReview(reviewContent, { 
                from: user1, 
                value: postFee 
            });

            expectEvent(tx, 'ReviewPosted', {
                id: '1',
                content: reviewContent,
                author: user1
            });

            const review = await reviewPlatform.getReview(1);
            assert.equal(review[1], reviewContent, "Review content wasn't stored correctly");
            assert.equal(review[3], user1, "Review author wasn't stored correctly");
        });

        it("should not allow posting a review with insufficient payment", async () => {
            const insufficientFee = web3.utils.toWei('0.00005', 'ether');
            
            await expectRevert(
                reviewPlatform.postReview(reviewContent, { 
                    from: user1, 
                    value: insufficientFee 
                }),
                "Insufficient payment to post review"
            );
        });

        it("should allow upvoting a review", async () => {
            // First post a review
            await reviewPlatform.postReview(reviewContent, { 
                from: user1, 
                value: postFee 
            });

            // Then upvote it
            const tx = await reviewPlatform.upvoteReview(1, { from: user2 });
            
            expectEvent(tx, 'ReviewUpvoted', {
                id: '1',
                upvotes: '1'
            });

            const review = await reviewPlatform.getReview(1);
            assert.equal(review[2].toString(), '1', "Review upvote wasn't counted correctly");
        });

        it("should not allow upvoting a non-existent review", async () => {
            await expectRevert(
                reviewPlatform.upvoteReview(999, { from: user1 }),
                "Invalid review ID"
            );
        });
    });

    describe("Fee Withdrawal", () => {
        it("should allow owner to withdraw fees", async () => {
            // First post a review to generate some fees
            await reviewPlatform.postReview("Test review", { 
                from: user1, 
                value: postFee 
            });

            const initialBalance = new web3.utils.BN(await web3.eth.getBalance(owner));
            
            // Withdraw fees
            await reviewPlatform.withdrawFees({ from: owner });
            
            const finalBalance = new web3.utils.BN(await web3.eth.getBalance(owner));
            assert.ok(finalBalance.gt(initialBalance), "Owner balance should have increased");
        });

        it("should not allow non-owner to withdraw fees", async () => {
            await expectRevert(
                reviewPlatform.withdrawFees({ from: user1 }),
                "Not contract owner"
            );
        });
    });

    describe("Review Retrieval", () => {
        it("should return correct review details", async () => {
            await reviewPlatform.postReview("Test review", { 
                from: user1, 
                value: postFee 
            });

            const review = await reviewPlatform.getReview(1);
            assert.equal(review[0].toString(), '1', "Incorrect review ID");
            assert.equal(review[1], "Test review", "Incorrect review content");
            assert.equal(review[2].toString(), '0', "Incorrect upvotes count");
            assert.equal(review[3], user1, "Incorrect author address");
        });

        it("should not allow retrieving non-existent review", async () => {
            await expectRevert(
                reviewPlatform.getReview(999),
                "Invalid review ID"
            );
        });
    });
}); 