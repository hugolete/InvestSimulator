import os
import discord
from discord.ext import commands
from discord import app_commands
import aiohttp
from dotenv import load_dotenv

load_dotenv()

API_BASE = os.getenv("API_BASE_URL", "http://localhost:8000")
TOKEN = os.getenv("DISCORD_TOKEN")
API_KEY = os.getenv("API_SECRET_KEY")


intents = discord.Intents.default()
bot = commands.Bot(command_prefix="!", intents=intents)


# ── helpers ──────────────────────────────────────────────────────────────────

async def api_get(path: str):
    async with aiohttp.ClientSession() as s:
        async with s.get(f"{API_BASE}{path}", headers={"X-API-Key": API_KEY}) as r:
            r.raise_for_status()
            return await r.json()


async def api_post(path: str, data: dict):
    async with aiohttp.ClientSession() as s:
        async with s.post(f"{API_BASE}{path}", data=data, headers={"X-API-Key": API_KEY}) as r:
            r.raise_for_status()
            return await r.json()


async def api_delete(path: str):
    async with aiohttp.ClientSession() as s:
        async with s.delete(f"{API_BASE}{path}", headers={"X-API-Key": API_KEY}) as r:
            r.raise_for_status()
            return await r.json()


def fmt_price(p) -> str:
    if p is None:
        return "N/A"
    try:
        f = float(p)
        return f"${f:,.2f}" if f >= 1 else f"${f:.6f}"
    except (TypeError, ValueError):
        return str(p)


def pct_emoji(v) -> str:
    try:
        return "🟢" if float(v) >= 0 else "🔴"
    except (TypeError, ValueError):
        return "⚪"


# ── events ───────────────────────────────────────────────────────────────────

@bot.event
async def on_ready():
    await bot.tree.sync()
    print(f"Logged in as {bot.user} — slash commands synced")


# ── /profiles ────────────────────────────────────────────────────────────────

@bot.tree.command(name="profiles", description="List all InvestSimulator profiles")
async def profiles(interaction: discord.Interaction):
    await interaction.response.defer()
    try:
        data = await api_get("/api/profiles")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    if not data:
        await interaction.followup.send("No profiles found.")
        return

    lines = [f"**ID {p['id']}** — {p['name']}" for p in data]
    embed = discord.Embed(title="📋 Profiles", description="\n".join(lines), color=0x5865F2)
    await interaction.followup.send(embed=embed)


@bot.tree.command(name="create_profile", description="Create a new InvestSimulator profile")
@app_commands.describe(name="Profile name")
async def create_profile(interaction: discord.Interaction, name: str):
    await interaction.response.defer()
    try:
        data = await api_post("/api/profiles", {"name": name})
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return
    embed = discord.Embed(
        title="✅ Profile created",
        description=f"**{data.get('name', name)}** — ID `{data.get('id')}`\nStarting balance: **$50,000 USD**",
        color=0x57F287,
    )
    await interaction.followup.send(embed=embed)


# ── /portfolio ────────────────────────────────────────────────────────────────

@bot.tree.command(name="portfolio", description="Show a profile's portfolio summary")
@app_commands.describe(user_id="Profile ID")
async def portfolio(interaction: discord.Interaction, user_id: int):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/profiles/{user_id}")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    assets = data.get("assets", [])
    total = data.get("total_worth", 0)
    perf = data.get("performance", {})

    embed = discord.Embed(title=f"💼 Portfolio — {data.get('profileName', user_id)}", color=0x5865F2)
    embed.add_field(name="Total worth", value=fmt_price(total), inline=True)

    # performance is a plain float (% vs $2000 baseline), not a dict
    perf_pct = perf if not isinstance(perf, dict) else None
    embed.add_field(
        name="Performance",
        value=f"{pct_emoji(perf_pct)} {float(perf_pct):+.2f}%" if perf_pct is not None else "N/A",
        inline=True,
    )

    cash_assets = [a for a in assets if a.get("type") == "fiat"]
    other_assets = [a for a in assets if a.get("type") != "fiat"]

    if cash_assets:
        cash_total = sum(float(a.get("worth", 0)) for a in cash_assets)
        embed.add_field(name="Cash", value=fmt_price(cash_total), inline=True)

    if other_assets:
        lines = []
        for a in other_assets[:10]:
            symbol = a.get("symbol", "?")
            qty = float(a.get("quantity", 0))
            val = float(a.get("worth", 0))
            lines.append(f"**{symbol}** × {qty:g} = {fmt_price(val)}")
        embed.add_field(name="Holdings", value="\n".join(lines) or "None", inline=False)

    await interaction.followup.send(embed=embed)


# ── /positions ────────────────────────────────────────────────────────────────

@bot.tree.command(name="positions", description="Show open positions with P&L")
@app_commands.describe(user_id="Profile ID")
async def positions(interaction: discord.Interaction, user_id: int):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/profiles/{user_id}/positions")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    if not data:
        await interaction.followup.send("No open positions.")
        return

    embed = discord.Embed(title=f"📊 Positions — profile {user_id}", color=0x5865F2)
    for pos in data[:15]:
        symbol = pos.get("symbol", "?")
        qty = pos.get("quantity", 0)
        pmp = pos.get("pmp", 0)
        current = pos.get("current_price", 0)
        gain = pos.get("pnl_percent", 0)
        value = pos.get("current_value", 0)
        embed.add_field(
            name=f"{pct_emoji(gain)} {symbol}",
            value=(
                f"Qty: `{float(qty):g}`\n"
                f"Avg: {fmt_price(pmp)} → {fmt_price(current)}\n"
                f"P&L: **{float(gain):+.2f}%** ({fmt_price(value)})"
            ),
            inline=True,
        )
    await interaction.followup.send(embed=embed)


# ── /price ────────────────────────────────────────────────────────────────────

@bot.tree.command(name="price", description="Get the current price of an asset")
@app_commands.describe(symbol="Asset symbol, e.g. BTC, AAPL")
async def price(interaction: discord.Interaction, symbol: str):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/assets/{symbol.upper()}")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    try:
        pct_data = await api_get(f"/api/prices/percentage/{symbol.upper()}")
    except Exception:
        pct_data = {}

    embed = discord.Embed(
        title=f"💰 {data.get('name', symbol.upper())} ({symbol.upper()})",
        color=0xFEE75C,
    )
    embed.add_field(name="Price", value=fmt_price(data.get("price")), inline=True)
    embed.add_field(name="Type", value=data.get("type", "?").capitalize(), inline=True)

    for period in ["1h", "1d", "1w", "1m"]:
        val = pct_data.get(period)
        if val is not None:
            embed.add_field(
                name=period.upper(),
                value=f"{pct_emoji(val)} {float(val):+.2f}%",
                inline=True,
            )

    await interaction.followup.send(embed=embed)


# ── /buy ──────────────────────────────────────────────────────────────────────

@bot.tree.command(name="buy", description="Buy an asset")
@app_commands.describe(
    user_id="Profile ID",
    symbol="Asset symbol, e.g. BTC, AAPL",
    amount="Amount in USD to spend",
    comment="Optional trade comment",
)
async def buy(interaction: discord.Interaction, user_id: int, symbol: str, amount: float, comment: str = ""):
    await interaction.response.defer()
    try:
        data = await api_post(
            "/api/buy",
            {
                "user_id": str(user_id),
                "symbol": symbol.upper(),
                "amount_fiat": str(amount),
                "comment": comment,
                "currency": "USD",
            },
        )
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    embed = discord.Embed(title=f"✅ Buy executed — {symbol.upper()}", color=0x57F287)
    embed.add_field(name="Spent", value=fmt_price(amount), inline=True)
    # API returns "amount" (qty received) and "assetUnitPrice" as strings like "150.0$"
    qty = data.get("amount")
    if qty is not None:
        embed.add_field(name="Quantity", value=f"{float(qty):g}", inline=True)
    px = data.get("assetUnitPrice")
    if px is not None:
        embed.add_field(name="Unit price", value=str(px), inline=True)
    if comment:
        embed.add_field(name="Comment", value=comment, inline=False)
    await interaction.followup.send(embed=embed)


# ── /sell ─────────────────────────────────────────────────────────────────────

@bot.tree.command(name="sell", description="Sell an asset")
@app_commands.describe(
    user_id="Profile ID",
    symbol="Asset symbol, e.g. BTC, AAPL",
    quantity="Quantity of the asset to sell",
    comment="Optional trade comment",
)
async def sell(interaction: discord.Interaction, user_id: int, symbol: str, quantity: float, comment: str = ""):
    await interaction.response.defer()
    try:
        data = await api_post(
            "/api/sell",
            {
                "user_id": str(user_id),
                "symbol": symbol.upper(),
                "asset_amount": str(quantity),
                "comment": comment,
                "currency": "USD",
            },
        )
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    embed = discord.Embed(title=f"✅ Sell executed — {symbol.upper()}", color=0xED4245)
    embed.add_field(name="Quantity sold", value=f"{quantity:g}", inline=True)
    # API returns "total_price" and "price" as strings like "1500.0$"
    received = data.get("total_price")
    if received is not None:
        embed.add_field(name="Received", value=str(received), inline=True)
    px = data.get("price")
    if px is not None:
        embed.add_field(name="Unit price", value=str(px), inline=True)
    if comment:
        embed.add_field(name="Comment", value=comment, inline=False)
    await interaction.followup.send(embed=embed)


# ── /history ──────────────────────────────────────────────────────────────────

@bot.tree.command(name="history", description="Show trade history for a profile")
@app_commands.describe(user_id="Profile ID", limit="Max trades to display (default 10)")
async def history(interaction: discord.Interaction, user_id: int, limit: int = 10):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/profiles/{user_id}/history")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    if not data:
        await interaction.followup.send("No trade history.")
        return

    recent = data[-limit:][::-1]
    lines = []
    for t in recent:
        side = t.get("side", "?")
        symbol = t.get("symbol", "?")
        qty = t.get("quantity", 0)
        px = t.get("price", 0)
        ts = t.get("timestamp", "")[:10]
        icon = "🟢" if side == "BUY" else "🔴"
        lines.append(f"{icon} **{side}** {symbol} × {float(qty):g} @ {fmt_price(px)} `{ts}`")

    embed = discord.Embed(
        title=f"📜 Trade history — profile {user_id}",
        description="\n".join(lines),
        color=0x5865F2,
    )
    await interaction.followup.send(embed=embed)


# ── /cash ─────────────────────────────────────────────────────────────────────

@bot.tree.command(name="cash", description="Show available cash for a profile")
@app_commands.describe(user_id="Profile ID")
async def cash(interaction: discord.Interaction, user_id: int):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/profiles/{user_id}/cash")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    amount = data if not isinstance(data, dict) else (data.get("cash") or data.get("usd") or data.get("balance"))
    await interaction.followup.send(f"💵 Available cash for profile `{user_id}`: **{fmt_price(amount)}**")


# ── /orders ───────────────────────────────────────────────────────────────────

@bot.tree.command(name="orders", description="List active stop-loss / take-profit orders")
@app_commands.describe(user_id="Profile ID")
async def orders(interaction: discord.Interaction, user_id: int):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/profiles/{user_id}/orders")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    if not data:
        await interaction.followup.send("No active orders.")
        return

    embed = discord.Embed(title=f"🔔 Orders — profile {user_id}", color=0xFEE75C)
    for o in data:
        symbol = o.get("symbol", "?")
        otype = o.get("type", "?")
        pct = o.get("target_perc", 0)
        trigger = o.get("trigger_price", 0)
        qty = o.get("quantity", 0)
        icon = "🛑" if otype == "STOP_LOSS" else "🎯"
        embed.add_field(
            name=f"{icon} {otype} — {symbol}",
            value=f"Trigger: {fmt_price(trigger)} ({float(pct):+.1f}%)\nQty: {float(qty):g}",
            inline=True,
        )
    await interaction.followup.send(embed=embed)


# ── /set_order ────────────────────────────────────────────────────────────────

@bot.tree.command(name="set_order", description="Create or update a stop-loss / take-profit order")
@app_commands.describe(
    user_id="Profile ID",
    symbol="Asset symbol",
    order_type="STOP_LOSS or TAKE_PROFIT",
    percentage="Trigger % (negative for stop-loss, positive for take-profit)",
    quantity="Quantity to sell when triggered",
)
@app_commands.choices(order_type=[
    app_commands.Choice(name="Stop Loss", value="STOP_LOSS"),
    app_commands.Choice(name="Take Profit", value="TAKE_PROFIT"),
])
async def set_order(
    interaction: discord.Interaction,
    user_id: int,
    symbol: str,
    order_type: str,
    percentage: float,
    quantity: float,
):
    await interaction.response.defer()
    try:
        # endpoint uses query params, not form data
        async with aiohttp.ClientSession() as s:
            async with s.post(
                f"{API_BASE}/api/profiles/{user_id}/orders",
                params={
                    "symbol": symbol.upper(),
                    "order_type": order_type,
                    "percentage": percentage,
                    "quantity": quantity,
                },
                headers={"X-API-Key": API_KEY}
            ) as r:
                r.raise_for_status()
                data = await r.json()
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    icon = "🛑" if order_type == "STOP_LOSS" else "🎯"
    # response: {"status": "success", "message": "stop-loss configuré à 150.00 (-5.0%)"}
    msg = data.get("message", "")
    embed = discord.Embed(
        title=f"{icon} Order set — {symbol.upper()}",
        description=f"Type: **{order_type}**\nQty: {quantity:g}\n{msg}",
        color=0x57F287,
    )
    await interaction.followup.send(embed=embed)


# ── /allprices ────────────────────────────────────────────────────────────────

@bot.tree.command(name="allprices", description="Show current prices for all assets")
@app_commands.describe(filter="Filter by type: crypto, stock, etf, currency, commodity")
@app_commands.choices(filter=[
    app_commands.Choice(name="All", value="all"),
    app_commands.Choice(name="Crypto", value="crypto"),
    app_commands.Choice(name="Stocks", value="stock"),
    app_commands.Choice(name="ETFs", value="etf"),
    app_commands.Choice(name="Currency", value="currency"),
])
async def allprices(interaction: discord.Interaction, filter: str = "all"):
    await interaction.response.defer()
    try:
        prices = await api_get("/api/allprices")
        assets = await api_get("/api/assets")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    type_map = {a["symbol"]: a["type"] for a in assets}

    if filter != "all":
        prices = {s: p for s, p in prices.items() if type_map.get(s) == filter}

    if not prices:
        await interaction.followup.send("No prices found.")
        return

    # group by type for display
    groups: dict[str, list[str]] = {}
    for symbol, p in sorted(prices.items()):
        t = type_map.get(symbol, "other")
        if filter == "all" and t in ("currency",):
            continue  # skip fiat clutter in "all" view
        line = f"**{symbol}** {fmt_price(p)}"
        groups.setdefault(t, []).append(line)

    type_labels = {"crypto": "Crypto", "stock": "Stocks", "etf": "ETFs", "currency": "Currency", "commodity": "Commodity"}
    embed = discord.Embed(title="💹 All prices", color=0x5865F2)

    for t, lines in groups.items():
        label = type_labels.get(t, t.capitalize())
        # split into chunks of 20 to stay within Discord field limits
        for i in range(0, len(lines), 20):
            chunk = lines[i:i + 20]
            embed.add_field(name=label if i == 0 else f"{label} (cont.)", value="\n".join(chunk), inline=True)
            if len(embed.fields) >= 24:
                break
        if len(embed.fields) >= 24:
            break

    await interaction.followup.send(embed=embed)


# ── /market ───────────────────────────────────────────────────────────────────

@bot.tree.command(name="market", description="Show daily performance for all assets")
async def market(interaction: discord.Interaction):
    await interaction.response.defer()
    try:
        data = await api_get("/api/performances")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    if not data:
        await interaction.followup.send("No performance data available.")
        return

    # API returns a list of {"symbol": ..., "percentage": ...} dicts
    items = sorted(data, key=lambda x: float(x.get("percentage") or 0), reverse=True)
    top = items[:8]
    bottom = items[-5:]

    embed = discord.Embed(title="📈 Market — daily performance", color=0x5865F2)

    top_lines = [f"{pct_emoji(x['percentage'])} **{x['symbol']}** {float(x['percentage']):+.2f}%" for x in top]
    embed.add_field(name="Top gainers", value="\n".join(top_lines), inline=True)

    bottom_lines = [f"{pct_emoji(x['percentage'])} **{x['symbol']}** {float(x['percentage']):+.2f}%" for x in bottom]
    embed.add_field(name="Top losers", value="\n".join(bottom_lines), inline=True)

    await interaction.followup.send(embed=embed)


# ── /favorites ────────────────────────────────────────────────────────────────

@bot.tree.command(name="favorites", description="List favorite assets for a profile")
@app_commands.describe(user_id="Profile ID")
async def favorites(interaction: discord.Interaction, user_id: int):
    await interaction.response.defer()
    try:
        data = await api_get(f"/api/favorites/{user_id}")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return

    symbols = data if isinstance(data, list) else data.get("favorites", [])
    if not symbols:
        await interaction.followup.send("No favorites set.")
        return

    await interaction.followup.send(f"⭐ Favorites for profile `{user_id}`: " + ", ".join(f"**{s}**" for s in symbols))


@bot.tree.command(name="add_favorite", description="Add an asset to favorites")
@app_commands.describe(user_id="Profile ID", symbol="Asset symbol")
async def add_favorite(interaction: discord.Interaction, user_id: int, symbol: str):
    await interaction.response.defer()
    try:
        await api_post(f"/api/favorites/{user_id}", {"symbol": symbol.upper()})
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return
    await interaction.followup.send(f"⭐ **{symbol.upper()}** added to favorites for profile `{user_id}`.")


@bot.tree.command(name="remove_favorite", description="Remove an asset from favorites")
@app_commands.describe(user_id="Profile ID", symbol="Asset symbol")
async def remove_favorite(interaction: discord.Interaction, user_id: int, symbol: str):
    await interaction.response.defer()
    try:
        await api_delete(f"/api/favorites/{user_id}/{symbol.upper()}")
    except Exception as e:
        await interaction.followup.send(f"Error: {e}")
        return
    await interaction.followup.send(f"🗑️ **{symbol.upper()}** removed from favorites for profile `{user_id}`.")


# ── entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if not TOKEN:
        raise RuntimeError("DISCORD_TOKEN is not set in .env")
    bot.run(TOKEN)
