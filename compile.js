const solc = require('solc');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'contracts', 'GreenPulse.sol'), 'utf8');

const input = {
    language: 'Solidity',
    sources: { 'GreenPulse.sol': { content: source } },
    settings: {
        optimizer: { enabled: true, runs: 200 },
        outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } }
    }
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
    output.errors.forEach(e => {
        if (e.severity === 'error') { console.error(e.formattedMessage); process.exit(1); }
        else console.warn(e.formattedMessage);
    });
}

const contracts = output.contracts['GreenPulse.sol'];
const result = {};

for (const [name, contract] of Object.entries(contracts)) {
    result[name] = {
        abi: contract.abi,
        bytecode: '0x' + contract.evm.bytecode.object
    };
    console.log(`✅ ${name}: ABI(${contract.abi.length} funcs) Bytecode(${contract.evm.bytecode.object.length} chars)`);
}

fs.writeFileSync(path.join(__dirname, 'contracts', 'compiled.json'), JSON.stringify(result, null, 2));
console.log('\n✅ Saved to contracts/compiled.json');
