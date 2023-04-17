const { Colors, Client, EmbedBuilder, GatewayIntentBits } = require('discord.js');
const client = new Client({
    intents: [GatewayIntentBits.Guilds],
});

const lowBalance = async (discord_token, discord_channel_id, {walletAddress, walletName, tokenAddress, message, chainId, link, roleIds = []} = {}) => {
    return new Promise((resolve, reject) => {
        client
            .on('ready', async () => {
                let embed = new EmbedBuilder();
                embed.setColor(Colors.Yellow);
                embed.setAuthor({
                    name: 'Low Balance',
                    iconURL: chainId ? `https://raw.githubusercontent.com/pangolindex/tokens/main/assets/${chainId}/0x0000000000000000000000000000000000000000/logo_24.png` : undefined,
                    url: link ?? undefined,
                })
                if (roleIds?.length > 0) {
                    embed.setDescription(roleIds.map(roleId => `<@&${roleId}>`).join(' '));
                }
                if (walletAddress) {
                    embed.addFields({name: walletName ?? 'Wallet', value: walletAddress, inline: false});
                }
                if (tokenAddress) {
                    embed.addFields({name: 'Token', value: tokenAddress, inline: false});
                }
                if (message) {
                    embed.addFields({name: 'Message', value: message});
                }
                await client.channels.cache.get(discord_channel_id).send({embeds: [embed]});
                client.destroy();
                resolve();
            })
            .login(discord_token);
    });
};

const vestingCompleted = async (discord_token, discord_channel_id, {transactionHashes = [], message, chainId, link, roleIds = []} = {}) => {
    return new Promise((resolve, reject) => {
        client
            .on('ready', async () => {
                let embed = new EmbedBuilder();
                embed.setColor(Colors.Green);
                embed.setAuthor({
                    name: 'Vesting Completed',
                    iconURL: chainId ? `https://raw.githubusercontent.com/pangolindex/tokens/main/assets/${chainId}/0x0000000000000000000000000000000000000000/logo_24.png` : undefined,
                    url: link ?? undefined,
                })
                if (roleIds?.length > 0) {
                    embed.setDescription(roleIds.map(roleId => `<@&${roleId}>`).join(' '));
                }
                transactionHashes.forEach(transactionHash => {
                    embed.addFields({name: 'Transaction', value: transactionHash});
                });
                if (message) {
                    embed.addFields({name: 'Message', value: message});
                }
                await client.channels.cache.get(discord_channel_id).send({embeds: [embed]});
                client.destroy();
                resolve();
            })
            .login(discord_token);
    });
};

const smartContractError = async (discord_token, discord_channel_id, {transactionHash, methodFrom, methodTo, methodName, message, chainId, link, roleIds = []} = {}) => {
    return new Promise((resolve, reject) => {
        client
            .on('ready', async () => {
                let embed = new EmbedBuilder();
                embed.setColor(Colors.Orange);
                embed.setAuthor({
                    name: 'Method Error',
                    iconURL: chainId ? `https://raw.githubusercontent.com/pangolindex/tokens/main/assets/${chainId}/0x0000000000000000000000000000000000000000/logo_24.png` : undefined,
                    url: link ?? undefined,
                })
                if (roleIds?.length > 0) {
                    embed.setDescription(roleIds.map(roleId => `<@&${roleId}>`).join(' '));
                }
                if (transactionHash) {
                    embed.addFields({name: 'Transaction', value: transactionHash});
                }
                if (methodFrom) {
                    embed.addFields({name: 'From', value: methodFrom, inline: true});
                }
                if (methodTo) {
                    embed.addFields({name: 'To', value: methodTo, inline: true});
                }
                if (methodName) {
                    embed.addFields({name: 'Method', value: methodName, inline: true});
                }
                if (message) {
                    embed.addFields({name: 'Message', value: message});
                }
                await client.channels.cache.get(discord_channel_id).send({ embeds: [embed]});
                client.destroy();
                resolve();
            })
            .login(discord_token);
    });
};

const generalAlert = async (discord_token, discord_channel_id, {title = 'Alert', message, chainId, link, color = Colors.Yellow, roleIds = []} = {}) => {
    return new Promise((resolve, reject) => {
        client
            .on('ready', async () => {
                let embed = new EmbedBuilder();
                embed.setColor(color);
                embed.setAuthor({
                    name: title,
                    iconURL: chainId ? `https://raw.githubusercontent.com/pangolindex/tokens/main/assets/${chainId}/0x0000000000000000000000000000000000000000/logo_24.png` : undefined,
                    url: link ?? undefined,
                })
                if (roleIds?.length > 0) {
                    embed.setDescription(roleIds.map(roleId => `<@&${roleId}>`).join(' '));
                }
                if (message) {
                    embed.addFields({name: 'Message', value: message});
                }
                await client.channels.cache.get(discord_channel_id).send({embeds: [embed]});
                client.destroy();
                resolve();
            })
            .login(discord_token);
    });
};

const generateAddressLink = (address, chainId) => {
    switch (chainId.toString()) {
        case '43113':
            return `https://testnet.snowtrace.io/address/${address}`;
        case '43114':
            return `https://snowtrace.io/address/${address}`;
        case '19':
            return `https://songbird-explorer.flare.network/address/${address}`;
        case '14':
            return `https://flare-explorer.flare.network/address/${address}`;
        case '16':
            return `https://coston-explorer.flare.network/address/${address}`;
        case '114':
            return `https://coston2-explorer.flare.network/address/${address}`;
        case '9000':
            return `https://evm.evmos.dev/address/${address}`;
        case '9001':
            return `https://escan.live/address/${address}`;
        case '1':
            return `https://etherscan.io/address/${address}`;
        default:
            return address;
    }
};

module.exports = {
    lowBalance,
    vestingCompleted,
    smartContractError,
    generalAlert,
    generateAddressLink,
};
