import { Character } from "./Character.js"
import { DamageType } from "./enum/DamageType.js";
import { EventType } from "./enum/EventType.js";
import type { DamageEvent, Events, StatusChangeEvent } from "./Event.js";
import { Passive } from "./Passive.js";
import { Status, type EffectContext } from "./Status.js";

export interface CharacterData {
	weaponid: string;
	statusid: string[];
	passiveid: string[];
}

export interface BattleContext {
    logger: BattleLogger;
}

export interface BattleLog {
	time: number;
	eventType: string;

	attacker?: number;
	receiver?: number;
	damage?: number;
	damageType?: string;

	owner?: number;
	statusId?: string;
	beforeStack?: number;
	afterStack?: number;
	delta?: number;
	reason?: string;

	

	sourceType?: string;
	sourceObjectType?: string;
	sourceId?: string;
	equipmentSlot?: number;
}

export class BattleLogger {
	BattleLog: BattleLog[] = [];

	constructor(private readonly getTime: () => number){}

	recordDamageEvent(event: DamageEvent, final: number){

		let srcType: string = "error";
		let srcOT: string = "error";
		let srcId: string = "error";

		if (event.damageSource instanceof Status){
			srcType = "status";
			srcOT = "status";
			srcId = event.damageSource.Id;
		}

		const log: BattleLog = {
			time: this.getTime(),
			eventType: "damage",
			attacker: event.attacker.Index,
			receiver: event.receiver.Index,
			damage: final,
			damageType: event.type,
			sourceType: srcType,
			sourceObjectType: srcOT,
			sourceId: srcId
        }

		this.BattleLog.push(log);
	}

	recordStatusChangeEvent(event: StatusChangeEvent, before: number, after: number){

		let srcType: string = "error";
		let srcOT: string = "error";
		let srcId: string = "error";

		if (event.changeSource instanceof Status){
			srcType = "status";
			srcOT = "status";
			srcId = event.changeSource.Id;
		}
		else if (event.changeSource instanceof Passive){
			srcType = "passive";
			srcOT = "passive";
			srcId = event.changeSource.Id;
		}

		const log: BattleLog = {
			time: this.getTime(),
			eventType: "status_stack_change",
			owner: event.holder.Index,
			statusId: event.status.Id,
			beforeStack: before,
			afterStack: after,
			delta: after - before,
			reason: event.reason,
			sourceType: srcType,
			sourceObjectType: srcOT,
			sourceId: srcId,
		}

		this.BattleLog.push(log);
	}
}

export class BattleManager{
 	Player: Character;
	Enemy: Character;
	BattleLogger: BattleLogger
	TickTime: number = 0.001

	currentTick: number = 0
	remainderTime: number = 0.0

	elapsedTime: number = 0

	running: boolean = true

	constructor(player: CharacterData){
		this.BattleLogger = new BattleLogger(() => this.get_battle_time(this.elapsedTime));

		const battleContext : BattleContext = {
			logger: this.BattleLogger
		}

		this.Player = new Character(battleContext, 0, player.weaponid, player.statusid, player.passiveid);
		this.Enemy = new Character(battleContext, 1);
	}

	run(): void {

		let ctx: EffectContext = {
			holder: this.Player,
		}
		this.Player.onStart();
		this.Enemy.onStart();

		while(true){
			this.elapsedTime++;

			/*if(this.elapsedTime % this.Player.WieldWeapon.WeaponCooldown == 0){
				this.record_attack(elapsedTime, 0, 1, this.Player, this.Enemy);
			}*/

			this.Player.Update(ctx);
				
			if(this.check_ending()){
				break;
			}
			
			/*if(elapsedTime % this.Enemy.WieldWeapon.WeaponCooldown == 0){
				this.record_attack(elapsedTime, 1, 0, this.Enemy, this.Player);
			}*/

			if(this.check_ending()){
				break;
			}

			if(this.elapsedTime >= 30000){
				break;
			}
		}
	}

	/*record_attack(elapsedTime: number, attackerIndex: number, receiverIndex: number, attacker: Character, receiver: Character): void {
		const weapon = attacker.WieldWeapon;

		this.BattleLog.push({
			time: this.get_battle_time(elapsedTime),
			attacker: attackerIndex,
			receiver: receiverIndex,
			damage: weapon.WeaponDamage,
			weaponName: weapon.WeaponId,
			damageType: "physical",
		});

		attacker.NormalAttack(receiver);
	}

	record_status_effect(elapsedTime: number, statusHolderIndex: number, targetIndex: number, effect: StatusEffectResult | null): void {
		if(effect == null){
			return;
		}

		this.BattleLog.push({
			time: this.get_battle_time(elapsedTime),
			attacker: statusHolderIndex,
			receiver: effect.receiver == "statusHolder" ? statusHolderIndex : targetIndex,
			damage: effect.damage,
			weaponName: effect.sourceName,
			damageType: effect.damageType,
		});
	}*/

	get_battle_time(elapsedTime: number): number {
		return Number((elapsedTime * this.TickTime).toFixed(6));
	}

	check_ending(): boolean {
		if(this.Player.HP <= 0.0 || this.Enemy.HP <= 0.0){
			return true;
		}

		return false;
	}
}

/*


func get_result() -> void:
	running = false
	if Enemy.HP <= 0.0:
		print("You Win")
	else:
		print("You Lose")
		
func _on_request_completed(result, response_code, headers, body):
	print(body.get_string_from_utf8())
	*/
