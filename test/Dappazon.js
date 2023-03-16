const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
	return ethers.utils.parseUnits(n.toString(), "ether");
};
const ID = 1;
const NAME = "Shoes";
const CATEGORY = "Clothing";
const IMAGE =
	"https://ipfs.io/ipfs/QmTYEboq8raiBs7GTUg2yLXB3PMz6HuBNgNfSZBx5Msztg/shoes.jpg";
const COST = tokens(1);
const RATING = 4;
const STOCK = 5;

describe("Dappazon", () => {
	let dappazon;
	let deployer, buyer;

	beforeEach(async () => {
		// Setup accounts
		[deployer, buyer] = await ethers.getSigners();

		// Deploy contract
		const Dappazon = await ethers.getContractFactory("Dappazon");
		dappazon = await Dappazon.deploy();
	});

	describe("Deployment", () => {
		it("Sets the owner", async () => {
			expect(await dappazon.owner()).to.eq(deployer.address);
		});
	});
	describe("Listing", () => {
		let transaction;
		beforeEach(async () => {
			transaction = await dappazon
				.connect(deployer)
				.list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
			await transaction.wait();
		});

		it("Returns item attributes", async () => {
			const item = await dappazon.items(ID);
			expect(item.id).to.eq(ID);
			expect(item.name).to.eq(NAME);
			expect(item.category).to.eq(CATEGORY);
			expect(item.image).to.eq(IMAGE);
			expect(item.cost).to.eq(COST);
			expect(item.rating).to.eq(RATING);
			expect(item.stock).to.eq(STOCK);
		});
		it("Emits List events", () => {
			expect(transaction).to.emit(dappazon, "List");
		});
	});

	describe("Buying", () => {
		let transaction;

		beforeEach(async () => {
			transaction = await dappazon
				.connect(deployer)
				.list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
			await transaction.wait();

			transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
		});

		it("Updates the contract balance", async () => {
			const result = await ethers.provider.getBalance(dappazon.address);
			expect(result).to.eq(COST);
		});
		it("Updates buyer's order count", async () => {
			const result = await dappazon.orderCount(buyer.address);
			expect(result).to.eq(1);
		});
		it("Adds the order", async () => {
			const order = await dappazon.orders(buyer.address, 1);

			expect(order.time).to.be.greaterThan(0);
			expect(order.item.name).to.eq(NAME);
		});
		it("Updates the contract balance", async () => {
			const result = await ethers.provider.getBalance(dappazon.address);
			expect(result).to.eq(COST);
		});
		it("Emits Buy event", () => {
			expect(transaction).to.emit(dappazon, "Buy");
		});
	});
	describe("Withdrawing", () => {
		let balanceBefore;

		beforeEach(async () => {
			// List an item
			let transaction = await dappazon
				.connect(deployer)
				.list(ID, NAME, CATEGORY, IMAGE, COST, RATING, STOCK);
			await transaction.wait();

			transaction = await dappazon.connect(buyer).buy(ID, { value: COST });
			await transaction.wait();

			balanceBefore = await ethers.provider.getBalance(deployer.address);

			transaction = await dappazon.connect(deployer).withdraw();
			await transaction.wait();
		});

		it("Updates the owner balance", async () => {
			const balanceAfter = await ethers.provider.getBalance(deployer.address);
			expect(balanceAfter).to.be.greaterThan(balanceBefore);
		});
		it("Updates the contract balance", async () => {
			const result = await ethers.provider.getBalance(dappazon.address);
			expect(result).to.eq(0);
		});
	});
});
