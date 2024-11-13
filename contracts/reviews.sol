// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ReviewPlatform {
    struct Review {
        uint id;
        string content;
        uint upvotes;
        address author;
    }

    uint public reviewCount = 0;
    uint public postFee = 0.0001 ether; // Set the fee to 0.01 ETH (can be adjusted)
    address public owner;
    mapping(uint => Review) public reviews;

    event ReviewPosted(uint id, string content, address author);
    event ReviewUpvoted(uint id, uint upvotes);

    constructor() {
        owner = msg.sender;
    }

    // Modifier to restrict access to owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Not contract owner");
        _;
    }

    // Function to allow the owner to update the post fee
    function updatePostFee(uint _newFee) public onlyOwner {
        postFee = _newFee;
    }

    // Post a review, requires the user to send 'postFee'
    function postReview(string memory _content) public payable {
        require(msg.value >= postFee, "Insufficient payment to post review");

        reviewCount++;
        reviews[reviewCount] = Review(reviewCount, _content, 0, msg.sender);
        emit ReviewPosted(reviewCount, _content, msg.sender);
    }

    // Upvote a review (no fee required)
    function upvoteReview(uint _id) public {
        require(_id > 0 && _id <= reviewCount, "Invalid review ID");
        reviews[_id].upvotes++;
        emit ReviewUpvoted(_id, reviews[_id].upvotes);
    }

    // Function to allow the owner to withdraw collected fees
    function withdrawFees() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }

    // Function to get review details
    function getReview(uint _id) public view returns (uint, string memory, uint, address) {
        require(_id > 0 && _id <= reviewCount, "Invalid review ID");
        Review memory rev = reviews[_id];
        return (rev.id, rev.content, rev.upvotes, rev.author);
    }
}
