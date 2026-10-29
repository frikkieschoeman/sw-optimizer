import sys, csv, json, collections
import os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from load import *
ROLL={2:8,4:8,6:8,8:6,9:6,10:7,11:8,12:8,1:375,3:20,5:20}   # max per roll, 6*
N2ID={v:k for k,v in STAT.items()}
# Mid-stage, strictness ~4 ("aggressive clean-out")
HIGH={'SPD':12,'HP%':16,'ATK%':16,'DEF%':16,'CRate':12,'CDmg':14,'ACC':16,'RES':16}
GOD ={'SPD':22,'HP%':28,'ATK%':28,'DEF%':28,'CRate':21,'CDmg':25,'ACC':28,'RES':28}
DUOS=[('SPD','HP%',14,16),('SPD','DEF%',14,16),('SPD','ATK%',14,16),('SPD','ACC',14,16),('CRate','CDmg',12,14),('ATK%','CDmg',16,14),('SPD','CRate',14,12)]
ROLES=[ # name, good subs, forbidden, must(any), mains{slot:[...]}
 ('Fast CC',   {'SPD','ACC','HP%','DEF%','RES'}, {'ATK%','CDmg'}, {'SPD'}, {2:['SPD','HP%','DEF%'],4:['HP%','DEF%'],6:['HP%','DEF%','ACC','RES']}),
 ('Classic DPS',{'SPD','ATK%','CRate','CDmg'}, {'DEF%','RES'}, {'CRate','CDmg'}, {2:['SPD','ATK%'],4:['CRate','CDmg','ATK%'],6:['ATK%']}),
 ('Bomber',    {'SPD','ATK%','ACC','ATK'}, {'DEF%','RES','HP%'}, {'ATK%'}, {2:['SPD','ATK%'],4:['ATK%'],6:['ATK%','ACC']}),
 ('Tank',      {'SPD','HP%','DEF%','RES','HP','DEF'}, {'ATK%','CRate','CDmg'}, {'HP%','DEF%'}, {2:['SPD','HP%','DEF%'],4:['HP%','DEF%'],6:['HP%','DEF%','RES']}),
 ('Bruiser',   {'SPD','HP%','DEF%','CRate','CDmg'}, {'ATK%','ACC'}, {'CRate','CDmg'}, {2:['SPD','HP%','DEF%'],4:['CRate','CDmg','HP%','DEF%'],6:['HP%','DEF%']}),
 ('Slow DPS',  {'ATK%','CRate','CDmg','HP%','DEF%'}, {'RES','ACC'}, {'CRate','CDmg'}, {2:['ATK%','HP%','DEF%'],4:['CRate','CDmg'],6:['ATK%','HP%','DEF%']}),
]
def lines(r):
    L={}
    if r['prefix_eff'][0]: L[STAT[r['prefix_eff'][0]]]=r['prefix_eff'][1]
    for st,v,e,g in r['sec_eff']: L[STAT[st]]=L.get(STAT[st],0)+v+g
    return L
def q(stat,v): return v/ROLL[N2ID[stat]]   # roll-equivalents
def main(r): return STAT[r['pri_eff'][0]]
def fit(r,L,lvl):
    slot=r['slot_no']; m=main(r)
    rolls_done=min(4,lvl//3)            # power-up rolls landed so far
    need_q = 3.0 + 0.5*rolls_done       # stat-strength bar scales with level
    for name,good,bad,must,mains in ROLES:
        if slot in mains and m not in mains[slot]: continue
        wasted=sum(q(STAT[s],v+g) for s,v,e,g in r['sec_eff'] if STAT[s] in bad)
        if wasted>1.5: continue
        pool={k:v for k,v in L.items() if k in good}
        if not ((set(pool)|{m}) & must): continue
        mins = 3 if slot%2 else 2
        if len(pool)<mins: continue
        if lvl>=12 and not any(v>=HIGH.get(k,999) for k,v in pool.items()): continue
        qs=sum(q(k,v) for k,v in pool.items() if k not in ('HP','ATK','DEF'))
        if qs<need_q: continue
        score=min(100,round(qs/(need_q+2.5)*75))
        return name,score
    return None,0
def god_duo(L):
    for k,v in L.items():
        if v>=GOD.get(k,999): return f'God roll {k} {v}'
    for a,b,x,y in DUOS:
        if L.get(a,0)>=x and L.get(b,0)>=y: return f'Duo {a} {L[a]}+{b} {L[b]}'
    return None
def grind_try(r):
    best=None
    for st,v,e,g in r['sec_eff']:
        nm=STAT[st]
        if nm not in ('SPD','HP%','DEF%','ATK%'): continue
        add=4 if nm=='SPD' else 8         # typical Legend grind
        if g>=add: continue
        r2=json.loads(json.dumps({k:r[k] for k in ('slot_no','pri_eff','prefix_eff','sec_eff')}))
        for s in r2['sec_eff']:
            if s[0]==st: s[3]=add
        L2=lines(r2); role,_=fit(r2,L2,12)
        if role: return f'grind {nm} -> {role}'
    return best
def judge(r):
    lvl=r['upgrade_curr']; L=lines(r); m=main(r); slot=r['slot_no']
    flat_even = slot in (2,4,6) and m in ('HP','ATK','DEF')
    role,fs=fit(r,L,lvl); gd=god_duo(L)
    if not role and gd: role='Universal (High Value)'
    if not role and lvl>=12 and eff(r)>=85: role,gd='Universal (High Value)','efficiency %d%%'%round(eff(r))
    if r['class']%10<6: return role, 'Sell', '5★ rune'
    if flat_even: return role,'Sell','flat main stat on slot %d'%slot
    if lvl<9:
        hasspd = 'SPD' in L or m=='SPD'
        if r['extra']%10<5 and not hasspd: return role,'Sell','Hero/Rare with no SPD line, not worth powering up'
        if hasspd and r['extra']%10==5: return role,'Upgrade','HIGH priority: Legend with SPD, take to +12'
        if role or gd or lvl<3: return role,'Upgrade','level it to +12 first' if r['extra']%10==5 or r['extra']>10 else 'level to +12 (Hero) first'
        return role,'Upgrade','no promising lines yet'
    if lvl<12:
        if role: return role,'Finish',f'{role} fit {fs}'
        if gd: return role,'Finish',gd
        return role,'Sell','no role or high-value line at +%d'%lvl
    if role and role!='Universal (High Value)':
        flats=[s for s,*_ in r['sec_eff'] if STAT[s] in ('HP','ATK','DEF') and not any(e for s2,v,e,g in r['sec_eff'] if s2==s)]
        enchanted=any(e for s,v,e,g in r['sec_eff'])
        if flats and not enchanted: return role,'Gem',f'{role}; gem the flat {STAT[flats[0]]} sub'
        return role,'Keep',f'{role} fit {fs}'
    if role: return role,'Keep',gd
    g=grind_try(r)
    if g: return role,'Grind',g
    legend = r['extra'] in (5,15)
    inn=STAT.get(r['prefix_eff'][0])
    if legend and SET.get(r['set_id']) in ('Violent','Will','Swift','Despair') and (slot%2 or m in ('SPD','HP%','DEF%','ATK%','CRate','CDmg','ACC')) and (inn in (None,'SPD','HP%','ACC','DEF%')) and eff(r)<75:
        return role,'Reapp','Legend %s, good set/main, weak subs'%SET.get(r['set_id'])
    why='no SPD sub' if 'SPD' not in L else 'weak lines for Mid'
    return role,'Sell',why
