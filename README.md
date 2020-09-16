# DEXG Staking Contract

The DEXG staking smart contract.

# Prerequisites

* [node v8+](https://nodejs.org)\
* [Truffle v5+](https://truffleframework.com)\
* Linux or Mac OS X

# Development

Install the Truffle toolkit:

```
$ npm install -g truffle
```

Install this project:

```
$ git clone git@github.com:dexg-finance/dexg-staking-contract.git
$ cd staking-contract
$ npm install
```

Compile this project:

```
$ truffle compile
```

Run the migrations:

```
$ truffle migrate
```

To test project contracts, open a new terminal and run the following to start a local Ethereum client:

```
$ truffle develop
```

In the previous terminal, run the following to test contracts:

```
$ truffle test
```

# Deploy

1. Open the `migrations/2_deploy_contracts.js` file and modify the pre-defined `start` and `end` timestamps. In the following example, the staking period is 60 seconds.

```
module.exports = function(deployer) {
	var start = 1600163700;
	var end = start + 60;

	deployer.deploy(Dextoken).then(() => {
		return deployer.deploy(StakingDextoken, Dextoken.address, start, end);
	})
};
```

* `start`: staking starts
* `end`: staking ends

2. Migrate contracts:

```
$ truffle migrate
```

# License

The MIT License

Copyright (c) 2020 The Flowchain Foundation. https://flowchain.co

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
